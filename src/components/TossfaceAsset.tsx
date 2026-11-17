import {useState} from 'react';

/**
 * Tossface is an officially published, separately licensed Toss asset.
 * The original SVGs are loaded from the publisher's public CDN, not bundled here.
 * Attribution and license: https://github.com/toss/tossface/blob/main/LICENSE
 * This component is NOT part of the private TDS UI Kit.
 */
type IconName = 'industry' | 'chart' | 'data' | 'links';
const iconInfo: Record<IconName,{file:string;fallback:string;label:string}> = {
  industry:{file:'u1F3ED.svg',fallback:'🏭',label:'산업'},
  chart:{file:'u1F4CA.svg',fallback:'📊',label:'차트'},
  data:{file:'u1F4CB.svg',fallback:'📋',label:'자료'},
  links:{file:'u1F517.svg',fallback:'🔗',label:'연결'},
};
const ASSET_ROOT='https://cdn.jsdelivr.net/gh/toss/tossface/dist/svg/';

export function TossfaceAsset({name,size=36,className='',decorative=true}:{name:IconName;size?:number;className?:string;decorative?:boolean}){
  const [broken,setBroken]=useState(false);
  const info=iconInfo[name];
  return <span className={`tossface-icon ${className}`} style={{width:size,height:size}} role={decorative?undefined:'img'} aria-label={decorative?undefined:info.label} aria-hidden={decorative?'true':undefined}>
    {broken?
      <span className="tossface-fallback" aria-hidden="true">{info.fallback}</span>:
      <img src={`${ASSET_ROOT}${info.file}`} alt="" width={size} height={size} loading="lazy" onError={()=>setBroken(true)}/>
    }
  </span>;
}

/** This exact icon path is shown in the official TDS Asset documentation. */
export function TdsCheckIcon(){
  const [broken,setBroken]=useState(false);
  return broken? <span className="tds-check-fallback" aria-hidden="true">✓</span> :
    <img className="tds-check-icon" width="18" height="18" alt="" aria-hidden="true" loading="lazy" src="https://static.toss.im/icons/svg/icon-check-circle-green.svg" onError={()=>setBroken(true)}/>;
}
