import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Answer-engine content, and the entity facts underneath it.
 *
 * An FAQ answer is only useful to an assistant if it survives being quoted with
 * none of its page around it, and only safe to publish as structured data if it
 * is the same text a human sees. The assertions here are about that: answers
 * that begin with the answer, facts stated identically everywhere they appear,
 * and no page publishing the same `FAQPage` graph as another page.
 */

const PUBLIC_PHONE_DISPLAY = "(973) 519-9717";
const TWILIO_SENDER_FRAGMENT = "750-0622";

const {
  CORE_FAQS,
  HOME_FAQS,
  DELIVERY_FAQS,
  FINANCING_FAQS,
  WARRANTY_FAQS,
  CATEGORY_FAQS,
  CATEGORY_SHARED_FAQS,
  DELIVERY_COST_ANSWER,
} = await import("@/lib/content/faq");
const { CATEGORY_ORDER, CATEGORY_LIST } = await import("@/lib/inventory/types");
const { STATIC_ROUTES } = await import("@/lib/seo/routes");
const { GUIDES } = await import("@/lib/content/guides");

const ALL_BANKS = [
  ["CORE_FAQS", CORE_FAQS],
  ["HOME_FAQS", HOME_FAQS],
  ["DELIVERY_FAQS", DELIVERY_FAQS],
  ["FINANCING_FAQS", FINANCING_FAQS],
  ["WARRANTY_FAQS", WARRANTY_FAQS],
  ...Object.entries(CATEGORY_FAQS),
] as const;

describe("answer quality", () => {
  test("every question is a question", () => {
    for (const [bank, entries] of ALL_BANKS) {
      for (const entry of entries) {
        assert.ok(entry.question.trim().endsWith("?"), `${bank}: "${entry.question}" is not a question`);
      }
    }
  });

  test("every answer is substantial enough to stand alone", () => {
    for (const [bank, entries] of ALL_BANKS) {
      for (const entry of entries) {
        assert.ok(
          entry.answer.trim().length >= 80,
          `${bank}: the answer to "${entry.question}" is too short to be quoted on its own`,
        );
      }
    }
  });

  test("no answer opens with marketing throat-clearing", () => {
    // "At KT Appliances we strive to provide excellent customer service…" is the
    // shape being excluded: the reader's question is unanswered until sentence
    // three, and an assistant quoting the opening produces nothing useful.
    const openers = [
      /^at kt appliances,? we/i,
      /^we (strive|pride|believe|understand|know that)/i,
      /^here at /i,
      /^our (mission|goal|commitment)/i,
      /^thank you/i,
      /^welcome/i,
    ];
    for (const [bank, entries] of ALL_BANKS) {
      for (const entry of entries) {
        for (const opener of openers) {
          assert.ok(
            !opener.test(entry.answer.trim()),
            `${bank}: "${entry.question}" opens with filler — "${entry.answer.slice(0, 60)}…"`,
          );
        }
      }
    }
  });

  test("a yes/no question is answered in the first word", () => {
    for (const [bank, entries] of ALL_BANKS) {
      for (const entry of entries) {
        if (!/^(do|does|can|is|are|will|should|did|has|have)\b/i.test(entry.question)) continue;
        assert.match(
          entry.answer.trim(),
          /^(Yes|No|It depends|Only|Whichever|Usually|Nearly all|Delivery|Financing|1-year|Requirements|Cosmetic)\b/,
          `${bank}: "${entry.question}" does not lead with the answer — "${entry.answer.slice(0, 50)}…"`,
        );
      }
    }
  });

  test("no answer promises something the business has not committed to", () => {
    // Same-day is offered "where possible", never guaranteed, and no warranty is
    // automatic. Absolute phrasings here would become absolute phrasings in an
    // AI answer, which the warehouse would then have to honour.
    const overclaims = [
      /guaranteed same-?day/i,
      /always same-?day/i,
      /every (unit|appliance) (is )?(comes with|includes) a warranty/i,
      /lifetime warranty/i,
      /free delivery/i,
      // Superlatives about the business, not about one purchase option being
      // cheaper than another — "buying the pair is usually the cheapest way to
      // replace a laundry room" is a true comparison, not a boast.
      /cheapest (appliance|price|store|place|in )/i,
      /(best|lowest|number one) (appliance store|prices)/i,
      /#1\b/,
      /award-winning/i,
    ];
    for (const [bank, entries] of ALL_BANKS) {
      for (const entry of entries) {
        for (const claim of overclaims) {
          assert.ok(
            !claim.test(entry.answer),
            `${bank}: "${entry.question}" contains an unsupported claim matching ${claim}`,
          );
        }
      }
    }
  });
});

describe("NAP consistency in answers", () => {
  test("the public business line is the only number in the answer bank", () => {
    for (const [bank, entries] of ALL_BANKS) {
      const text = entries.map((entry) => entry.answer).join(" ");
      assert.ok(
        !text.includes(TWILIO_SENDER_FRAGMENT),
        `${bank} publishes the Twilio sending number`,
      );
      for (const match of text.matchAll(/\(\d{3}\)\s?\d{3}-\d{4}/g)) {
        assert.equal(match[0], PUBLIC_PHONE_DISPLAY, `${bank} publishes an unexpected number`);
      }
    }
  });

  test("the warehouse address is stated consistently", () => {
    const located = CORE_FAQS.find((entry) => entry.question.includes("located"));
    assert.ok(located);
    assert.match(located.answer, /109 Burson St, East Stroudsburg, PA 18301/);
  });
});

describe("category FAQ sets", () => {
  test("every category has its own set", () => {
    for (const slug of CATEGORY_ORDER) {
      assert.ok(CATEGORY_FAQS[slug]?.length, `${slug} has no category FAQs`);
    }
  });

  test("no two categories publish the same FAQ graph", () => {
    // Seven category pages emitting byte-identical FAQPage JSON-LD is the
    // duplicate structured data that gets rich results discarded — and seven
    // pages answering nothing about the appliance being looked at.
    const fingerprints = CATEGORY_ORDER.map((slug) =>
      [...CATEGORY_FAQS[slug], ...CATEGORY_SHARED_FAQS]
        .map((entry) => entry.question)
        .join("|"),
    );
    assert.equal(
      new Set(fingerprints).size,
      fingerprints.length,
      "two categories publish an identical FAQ set",
    );
  });

  test("no single question is asked on more than two category pages", () => {
    // The two shared answers are intentional; anything beyond that is drift back
    // towards one generic set.
    const counts = new Map<string, number>();
    for (const slug of CATEGORY_ORDER) {
      for (const entry of CATEGORY_FAQS[slug]) {
        counts.set(entry.question, (counts.get(entry.question) ?? 0) + 1);
      }
    }
    for (const [question, count] of counts) {
      assert.ok(count === 1, `"${question}" appears on ${count} category pages`);
    }
  });
});

describe("shared answers cannot drift", () => {
  test("the delivery-cost answer is one string used everywhere", () => {
    // Rendered as the page's direct-answer block and as its FAQ entry and into
    // its FAQ schema. Three copies of the wording would eventually be three
    // different prices.
    const faq = DELIVERY_FAQS.find((entry) => entry.question.includes("How much does appliance delivery cost"));
    assert.ok(faq);
    assert.equal(faq.answer, DELIVERY_COST_ANSWER);
  });

  test("the delivery-cost answer names what the price depends on", () => {
    for (const factor of ["warehouse", "appliance", "installation", "haul-away"]) {
      assert.ok(DELIVERY_COST_ANSWER.includes(factor), `the answer omits "${factor}"`);
    }
  });
});

describe("route registry", () => {
  test("every static route has an honest review date", () => {
    for (const route of STATIC_ROUTES) {
      assert.match(route.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${route.path} has a malformed date`);
      const stamp = Date.parse(route.reviewedAt);
      assert.ok(!Number.isNaN(stamp), `${route.path} has an unparseable date`);
      assert.ok(stamp <= Date.now(), `${route.path} claims a review date in the future`);
    }
  });

  test("no route is registered twice", () => {
    const paths = STATIC_ROUTES.map((route) => route.path);
    assert.equal(new Set(paths).size, paths.length);
  });

  test("no admin, API or shopper-tool route is registered", () => {
    for (const route of STATIC_ROUTES) {
      assert.ok(!route.path.startsWith("/admin"), `${route.path} must not be indexable`);
      assert.ok(!route.path.startsWith("/api"), `${route.path} must not be indexable`);
      assert.ok(route.path !== "/inventory/saved" && route.path !== "/inventory/compare");
    }
  });

  test("priorities are within the sitemap's valid range", () => {
    for (const route of STATIC_ROUTES) {
      assert.ok(route.priority >= 0 && route.priority <= 1, `${route.path} priority out of range`);
    }
  });

  test("every commercially important route is registered", () => {
    const paths = new Set(STATIC_ROUTES.map((route) => route.path));
    for (const path of ["/", "/inventory", "/service-areas", "/delivery-installation", "/contact"]) {
      assert.ok(paths.has(path), `${path} is missing from the route registry`);
    }
  });
});

describe("category definitions", () => {
  test("every category has a distinct path and real buying copy", () => {
    const paths = CATEGORY_LIST.map((category) => category.path);
    assert.equal(new Set(paths).size, paths.length);
    for (const category of CATEGORY_LIST) {
      assert.ok(category.intro.length >= 150, `${category.slug} intro is thin`);
      assert.match(category.path, /^\/[a-z-]+$/);
    }
  });
});

describe("guides", () => {
  test("slugs are unique and URL-safe", () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  test("meta titles and descriptions are unique and sized for a SERP", () => {
    const titles = GUIDES.map((guide) => guide.metaTitle);
    assert.equal(new Set(titles).size, titles.length);
    for (const guide of GUIDES) {
      assert.ok(guide.metaTitle.length <= 60, `${guide.slug} metaTitle is ${guide.metaTitle.length} chars`);
      assert.ok(
        guide.description.length >= 70 && guide.description.length <= 300,
        `${guide.slug} description is ${guide.description.length} chars`,
      );
    }
  });

  test("review dates are real and not in the future", () => {
    for (const guide of GUIDES) {
      assert.match(guide.updated, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(Date.parse(guide.updated) <= Date.now(), `${guide.slug} is dated in the future`);
    }
  });
});
