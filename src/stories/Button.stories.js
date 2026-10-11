import { Button } from '../../admin-new/js/components/ui/Button.js';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'DALLI Button component with multiple variants, sizes, and states.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'accent', 'danger', 'success', 'warning', 'info', 'crypto'],
      description: 'Button variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'icon'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    loading: {
      control: 'boolean',
      description: 'Loading state',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Full width button',
    },
    iconOnly: {
      control: 'boolean',
      description: 'Icon only button',
    },
    onClick: { action: 'clicked' },
  },
};

export const Primary = {
  args: {
    text: 'Primary Button',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary = {
  args: {
    text: 'Secondary Button',
    variant: 'secondary',
    size: 'md',
  },
};

export const Outline = {
  args: {
    text: 'Outline Button',
    variant: 'outline',
    size: 'md',
  },
};

export const Ghost = {
  args: {
    text: 'Ghost Button',
    variant: 'ghost',
    size: 'md',
  },
};

export const Crypto = {
  args: {
    text: 'Pay with Crypto',
    variant: 'crypto',
    size: 'lg',
  },
};

export const Accent = {
  args: {
    text: 'Accent Button',
    variant: 'accent',
    size: 'md',
  },
};

export const Danger = {
  args: {
    text: 'Delete',
    variant: 'danger',
    size: 'md',
  },
};

export const Success = {
  args: {
    text: 'Success',
    variant: 'success',
    size: 'md',
  },
};

export const Sizes = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = 'var(--space-4)';
    container.style.flexWrap = 'wrap';
    container.style.alignItems = 'center';
    
    ['sm', 'md', 'lg', 'xl'].forEach(size => {
      const btn = Button.create({
        text: size.toUpperCase(),
        variant: 'primary',
        size,
      });
      container.appendChild(btn.element);
    });
    
    return container;
  },
};

export const Variants = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = 'var(--space-4)';
    container.style.flexWrap = 'wrap';
    container.style.alignItems = 'center';
    
    ['primary', 'secondary', 'outline', 'ghost', 'accent', 'danger', 'success', 'warning', 'info', 'crypto'].forEach(variant => {
      const btn = Button.create({
        text: variant.charAt(0).toUpperCase() + variant.slice(1),
        variant,
        size: 'md',
      });
      container.appendChild(btn.element);
    });
    
    return container;
  },
};

export const States = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = 'var(--space-4)';
    container.style.flexWrap = 'wrap';
    container.style.alignItems = 'center';
    
    const states = [
      { variant: 'primary', disabled: false, loading: false, label: 'Default' },
      { variant: 'primary', disabled: true, loading: false, label: 'Disabled' },
      { variant: 'primary', disabled: false, loading: true, label: 'Loading' },
      { variant: 'primary', fullWidth: true, loading: false, label: 'Full Width' },
    ];
    
    states.forEach(({ variant, disabled, loading, fullWidth, label }) => {
      const btn = Button.create({
        text: label,
        variant,
        size: 'md',
        disabled,
        loading,
        fullWidth,
      });
      container.appendChild(btn.element);
    });
    
    return container;
  },
};

export const WithIcon = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = 'var(--space-4)';
    container.style.flexWrap = 'wrap';
    container.style.alignItems = 'center';
    
    const icons = [
      { label: 'Add', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>' },
      { label: 'Download', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>' },
      { label: 'Settings', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.82-.33l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H22a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4"/></svg>' },
    ];
    
    icons.forEach(({ label, icon }) => {
      const btn = Button.create({
        variant: 'primary',
        size: 'md',
        icon,
        text: label,
      });
      container.appendChild(btn.element);
    });
    
    return container;
  },
};

export const IconOnly = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = 'var(--space-4)';
    container.style.alignItems = 'center';
    
    const icons = [
      { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>', ariaLabel: 'Add' },
      { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>', ariaLabel: 'Search' },
      { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', ariaLabel: 'Wishlist' },
      { icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', ariaLabel: 'Settings' },
    ];
    
    icons.forEach(({ icon, ariaLabel }) => {
      const btn = Button.create({
        variant: 'outline',
        size: 'icon',
        icon,
        iconOnly: true,
      });
      btn.element.setAttribute('aria-label', ariaLabel);
      container.appendChild(btn.element);
    });
    
    return container;
  },
};

export const CryptoButton = {
  args: {
    variant: 'crypto',
    size: 'lg',
    text: 'Plaćajte sa Bitcoin/ETH/USDT — 15% popust',
  },
};

export const LoadingStates = {
  render: () => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = 'var(--space-4)';
    container.style.flexWrap = 'wrap';
    container.style.alignItems = 'center';
    
    const states = [
      { label: 'Default', loading: false },
      { label: 'Loading...', loading: true },
    ];
    
    states.forEach(({ label, loading }) => {
      const btn = Button.create({
        variant: 'primary',
        size: 'md',
        text: label,
        loading,
      });
      container.appendChild(btn.element);
    });
    
    return container;
  },
};