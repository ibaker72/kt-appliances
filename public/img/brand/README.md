# Adding the KT Appliances logo

Two steps. Nothing else on the site needs touching.

## 1. Put the file here

Save the logo into this folder — `public/img/brand/` — as one of:

| Format | Filename to use | Notes |
| --- | --- | --- |
| SVG | `kt-appliances-logo.svg` | Best. Stays sharp at every size, smallest file. |
| PNG | `kt-appliances-logo.png` | Fine. Use a **transparent background** and at least **1000px wide**. |
| JPG | `kt-appliances-logo.jpg` | Works, but it will have a white box around it. Prefer PNG. |

A PDF will not work in a browser — if that is all you have, export or screenshot
it to PNG at the largest size you can, or open the PDF and "Save as image".

Uploading through GitHub in a browser: open this folder on github.com, click
**Add file → Upload files**, drag the logo in, then **Commit changes**.

## 2. Switch it on

Open `src/lib/site-config.ts`, find `logoFile`, and set it to the path:

```ts
brand: {
  logoFile: "/img/brand/kt-appliances-logo.png",   // <- was null
```

The path always starts with `/img/brand/` — not `public/`.

That is it. The moment it is set:

- the header, footer and admin shell all switch to the real artwork
- the typographic "KT APPLIANCES" stand-in stops rendering anywhere
- the LocalBusiness structured data points search engines at the real logo

Set it back to `null` to return to the stand-in.

## About the dark footer

The logo has a dark brown frame and black lettering, both of which disappear
against the near-black footer. It is placed on a white card there, which is what
the mark was drawn against.

If you have a light-on-dark version of the logo, set `logoNeedsLightPlate: false`
in the same block and it will sit directly on the dark background instead.

## What deliberately does not change

The **browser tab icon** stays the red KT monogram. The full logo — frame, three
appliances, script wordmark and ribbon — turns to mush below about 96px, and a
tab icon is 16px. The monogram is the part that survives at that size, which is
how most retail brands handle it. Same for the iOS home-screen icon.

To change those anyway, edit `src/app/icon.svg` and `src/app/apple-icon.tsx`.

The **social share card** (`src/app/opengraph-image.tsx`) also keeps the
monogram lockup. It is generated at request time, so pulling in an external
image file there is a slower and more fragile path than it is worth — say the
word if you want it swapped and I will wire it up properly.
