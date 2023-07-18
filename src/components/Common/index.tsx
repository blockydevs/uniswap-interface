import { css } from 'styled-components/macro'

export const ScrollBarStyles = css<{ $isHorizontalScroll?: boolean }>`
  // Firefox scrollbar styling
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.accentGray}`};
  height: 100%;

  // safari and chrome scrollbar styling
  ::-webkit-scrollbar {
    background: transparent;

    // Set height for horizontal scrolls
    ${({ $isHorizontalScroll }) => {
      return $isHorizontalScroll
        ? css`
            height: 4px;
            overflow-x: scroll;
          `
        : css`
            width: 4px;
            overflow-y: scroll;
          `
    }}
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.accentGray};
    border-radius: 8px;
  }
`
