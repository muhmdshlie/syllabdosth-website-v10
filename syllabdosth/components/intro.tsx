// Logo intro curtain for the home page. Plays once per browser session.
// A tiny inline script runs before paint, so returning visitors never see a flash of it.
const script = `try{var d=document.documentElement;if(sessionStorage.getItem('sd-intro'))d.classList.add('intro-seen');sessionStorage.setItem('sd-intro','1');setTimeout(function(){d.classList.add('intro-seen')},4000)}catch(e){document.documentElement.classList.add('intro-seen')}`;

export function Intro({ logo = '/logo-white.png' }: { logo?: string }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <div className="intro" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={853} height={208} className="h-14 w-auto sm:h-16" />
        <span className="bar" />
      </div>
    </>
  );
}
