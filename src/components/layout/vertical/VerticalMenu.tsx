// MUI Imports
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, SubMenu, MenuItem, MenuSection } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: { scrollMenu: (container: any, isPerfectScrollbar: boolean) => void }) => {
  // Hooks
  const theme = useTheme()
  const { isBreakpointReached, transitionDuration } = useVerticalNav()

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu menuItemStyles={menuItemStyles(theme)} menuSectionStyles={menuSectionStyles(theme)}>
        {/* Dashboard Section */}
        <MenuItem href='/' icon={<i className='ri-dashboard-line' />}>
          Home
        </MenuItem>
        <MenuItem href='/add-sale' icon={<i className='ri-pantone-line' />}>
          Add Sale
        </MenuItem>
        {/* Sales Management */}
        <SubMenu label='Sales Management' icon={<i className='ri-shopping-cart-line' />}>
          <MenuItem href='/sales-history' icon={<i className='ri-file-list-line' />}>
            Sales View
          </MenuItem>
          <MenuItem href='/pending-bills' icon={<i className='ri-money-dollar-circle-line' />}>
            Pending Bills
          </MenuItem>
          <MenuItem href='/sales-transaction' icon={<i className='ri-file-list-line' />}>
            Sales Transaction
          </MenuItem>
        </SubMenu>

        {/* Purchase Management */}
        <SubMenu label='Purchase Management' icon={<i className='ri-book-line' />}>
          <MenuItem href='/purchase/raw-material' icon={<i className='ri-tools-line' />}>
            Raw Materials
          </MenuItem>
          <MenuItem href='/purchase/packing-material' icon={<i className='ri-archive-line' />}>
            Packing Materials
          </MenuItem>
        </SubMenu>

        {/* Product Management */}
        <SubMenu label='Product Management' icon={<i className='ri-product-hunt-line' />}>
          <MenuItem href='/products/oil' icon={<i className='ri-drop-line' />}>
            Oil
          </MenuItem>
          <MenuItem href='/products/others' icon={<i className='ri-grid-line' />}>
            Other Products
          </MenuItem>
        </SubMenu>

        {/* Financial Management */}
        <SubMenu label='Financial Management' icon={<i className='ri-bar-chart-box-line' />}>
          <MenuItem href='/expenses' icon={<i className='ri-wallet-line' />}>
            Expenses
          </MenuItem>
          <MenuItem href='/miscellaneous' icon={<i className='ri-file-list-line' />}>
            Miscellaneous
          </MenuItem>
        </SubMenu>

        {/* Settings & Administration */}
        <MenuItem href='/audit' icon={<i className='ri-checkbox-multiple-line' />}>
          Audit
        </MenuItem>
        <MenuItem href='/a' icon={<i className='ri-file-search-line' />}>
          Analysis
        </MenuItem>
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
