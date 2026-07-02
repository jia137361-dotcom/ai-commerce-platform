declare module "react" {
  export type ReactNode = unknown
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void
  export function useMemo<T>(factory: () => T, deps?: unknown[]): T
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void]
  const React: {
    StrictMode: (props: { children?: ReactNode }) => unknown
  }
  export default React
}

declare module "react-dom/client" {
  export function createRoot(element: Element): {
    render(children: unknown): void
  }
}

declare module "react/jsx-runtime" {
  export const jsx: unknown
  export const jsxs: unknown
  export const Fragment: unknown
}

interface ImportMeta {
  env: Record<string, string | undefined>
}

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number
  }
  interface IntrinsicElements {
    [elementName: string]: any
  }
}
