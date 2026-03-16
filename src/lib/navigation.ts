interface NavigationTarget {
  lat: number;
  lng: number;
  name: string;
}

function isMobile() {
  if (typeof window === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

export function getKakaoMapUrl(target: NavigationTarget): string {
  const appUrl = `kakaomap://route?ep=${target.lat},${target.lng}&by=foot`;
  const webUrl = `https://map.kakao.com/link/to/${encodeURIComponent(target.name)},${target.lat},${target.lng}`;
  return isMobile() ? appUrl : webUrl;
}

export function getNaverMapUrl(target: NavigationTarget, appName: string): string {
  return `nmap://route/walk?dlat=${target.lat}&dlng=${target.lng}&dname=${encodeURIComponent(target.name)}&appname=${appName}`;
}
