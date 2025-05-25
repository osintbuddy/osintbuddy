import { MouseEventHandler } from 'preact/compat'

interface HamburgerProps {
  isOpen: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

function HamburgerMenu({ isOpen, onClick, className }: HamburgerProps) {
  return (
    <button
      onClick={onClick}
      class={`hamburger ${className ?? ''} ${isOpen && 'is-active'}`}>
      <span className='line' />
      <span className='line' />
      <span className='line' />
    </button>
  );
}

export default HamburgerMenu;
