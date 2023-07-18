import { style } from '@vanilla-extract/css'

import { sprinkles, vars } from './sprinkles.css'

export const lightGrayOverlayOnHover = style([
  sprinkles({
    transition: '250',
  }),
  {
    ':hover': {
      background: vars.color.lightGrayOverlay,
    },
  },
])
