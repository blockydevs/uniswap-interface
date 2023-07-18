import Row from 'components/Row'
import { NftStandard } from 'graphql/data/__generated__/types-and-hooks'
import { getMarketplaceIcon } from 'nft/components/card/utils'
import { CollectionSelectedAssetIcon } from 'nft/components/icons'
import { Markets } from 'nft/types'
import { Check, Tag } from 'react-feather'
import styled from 'styled-components/macro'

const StyledMarketplaceContainer = styled.div<{ isText?: boolean }>`
  position: absolute;
  display: flex;
  top: 12px;
  left: 12px;
  height: 32px;
  width: ${({ isText }) => (isText ? 'auto' : '32px')};
  padding: ${({ isText }) => (isText ? '0px 8px' : '0px')};
  background: rgba(93, 103, 133, 0.24);
  color: ${({ theme }) => theme.accentTextLightPrimary};
  justify-content: center;
  align-items: center;
  border-radius: 32px;
  z-index: 2;
`

const ListPriceRowContainer = styled(Row)`
  gap: 6px;
  color: ${({ theme }) => theme.accentTextLightPrimary};
  font-size: 14px;
  font-weight: 600;
  line-height: 16px;
  text-shadow: 1px 1px 3px rgba(51, 53, 72, 0.54);
`

export const MarketplaceContainer = ({
  isSelected,
  marketplace,
  tokenType,
  listedPrice,
  hidePrice,
}: {
  isSelected: boolean
  marketplace?: Markets
  tokenType?: NftStandard
  listedPrice?: string
  hidePrice?: boolean
}) => {
  if (isSelected) {
    if (!marketplace) {
      return (
        <StyledMarketplaceContainer>
          <Check size={20} />
        </StyledMarketplaceContainer>
      )
    }

    return (
      <StyledMarketplaceContainer>
        <CollectionSelectedAssetIcon width="20px" height="20px" viewBox="0 0 20 20" />
      </StyledMarketplaceContainer>
    )
  }

  if (listedPrice && !hidePrice) {
    return (
      <StyledMarketplaceContainer isText={true}>
        <ListPriceRowContainer>
          <Tag size={20} />
          {listedPrice} ETH
        </ListPriceRowContainer>
      </StyledMarketplaceContainer>
    )
  }

  if (!marketplace || tokenType === NftStandard.Erc1155) {
    return null
  }

  return <StyledMarketplaceContainer>{getMarketplaceIcon(marketplace)}</StyledMarketplaceContainer>
}
