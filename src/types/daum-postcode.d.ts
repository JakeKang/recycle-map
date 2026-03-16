interface DaumPostcodeResult {
  zonecode: string;
  address: string;
  addressType: "R" | "J";
  roadAddress: string;
  jibunAddress: string;
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
  sido: string;
  sigungu: string;
}

type DaumPostcodeConstructor = new (options: {
  oncomplete: (data: DaumPostcodeResult) => void;
  onresize?: (size: { width: number; height: number }) => void;
  theme?: Record<string, string>;
  width?: number | string;
  height?: number | string;
}) => {
  open(options?: {
    q?: string;
    popupTitle?: string;
    autoClose?: boolean;
  }): void;
  embed(
    element: HTMLElement,
    options?: {
      q?: string;
      autoClose?: boolean;
    },
  ): void;
};

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcodeConstructor;
    };
  }
}

export {};
