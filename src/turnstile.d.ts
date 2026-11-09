interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  getResponse: (id?: string) => string | undefined;
}

interface Window {
  turnstile?: TurnstileApi;
  onTsLoad?: () => void;
  onTsLogin?: () => void;
}
