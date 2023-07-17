import { Box } from 'rebass/styled-components'
import styled from 'styled-components/macro'

const Card = styled(Box)<{ width?: string; padding?: string; border?: string; $borderRadius?: string }>`
  width: ${({ width }) => width ?? '100%'};
  padding: ${({ padding }) => padding ?? '1rem'};
  border-radius: ${({ $borderRadius }) => $borderRadius ?? '16px'};
  border: ${({ border }) => border};
`
export default Card

export const LightCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.backgroundInteractive};
  background-color: ${({ theme }) => theme.deprecated_bg1};
`

export const GrayCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: ${({ theme }) => theme.accentAction};
  color: ${({ theme }) => theme.white};
`

export const OutlineCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.deprecated_bg3};
`
