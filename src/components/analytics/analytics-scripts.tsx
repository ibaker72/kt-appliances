import Script from "next/script";

/**
 * Loads GA4 and the Meta Pixel — each only when its ID is configured, and each
 * exactly once. Both load with `afterInteractive` so they never block the LCP
 * of a paid-traffic landing page.
 */
export function AnalyticsScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();

  // GA4 and Google Ads share the gtag.js loader; load it once using whichever
  // ID is present, then configure both targets.
  const gtagLoaderId = gaId || adsId;

  return (
    <>
      {gtagLoaderId ? (
        <>
          <Script
            id="gtag-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagLoaderId}`}
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
window.gtag=window.gtag||gtag;gtag('js',new Date());
${gaId ? `gtag('config','${gaId}');` : ""}${adsId ? `gtag('config','${adsId}');` : ""}`}
          </Script>
        </>
      ) : null}

      {pixelId ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
