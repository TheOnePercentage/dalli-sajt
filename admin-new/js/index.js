import { Component, defineComponent } from './core/component.js';
import { ImperiumStore, createStore, combineReducers } from './core/store.js';
import { ThemeManager, ColorPalette, generateThemeCSS } from './core/theme.js';
import { App, createApp } from './core/app.js';
import { Router, createRouter } from './core/router.js';
import { APIClient, createApi, api } from './utils/api.js';
import { ImperiumStorage, ImperiumSessionStorage } from './utils/storage.js';
import { ImperiumUtils } from './utils/helpers.js';
import { encryptToken, decryptToken, encryptData, decryptData, cryptoManager } from './utils/crypto.js';
import { loadChartJS, createROASChart, createStackedBarChart, createDoughnutChart, destroyChart, destroyAllCharts, updateChartTheme } from './utils/charts.js';
import { playSoundEvent, playSoundSequence, setSoundEnabled, isSoundEnabled, setMasterVolume, getMasterVolume, loadSoundSettings, getSoundEvents, getSoundCategories, testSoundEvent, preloadAudioContext, playAlertSound, ALERT_SOUND_MAP, SOUND_PRESETS } from './utils/sound-events.js';
import { apiService, SectionAPI, APIMixin, useAPI, withAPI, cacheService, errorBoundary, performanceMonitor, realtimeService, CollaborativeEditor, analyticsService, multiTenantService, securityService } from './services/integration.js';

import { Button, Input, Textarea, Select, Checkbox, Radio, Switch } from './components/forms.js';
import { Modal, Toast, ToastContainer } from './components/modals-toasts.js';
import { Table, Pagination } from './components/table.js';
import { Dropdown, SelectDropdown, Tooltip, Popover } from './components/dropdown.js';
import { Sidebar, NavigationController, createSidebar, createNavigationController } from './components/sidebar.js';
import { Tabs, createTabs, initTabsFromDOM } from './components/tabs.js';
import { Topbar, PageHeader } from './components/layout.js';
import { AlertBanner, AlertCenter } from './components/alert-banner.js';
import { CommandPalette } from './components/command-palette.js';
import { StatusIndicator, PlatformCard, ConnectModal, QuickAccessShortcuts } from './components/social-connections.js';
import { BottomSheet, createActionSheet, createConfirmSheet, createSelectionSheet } from './components/bottom-sheet.js';
import { PullToRefresh, createPullToRefreshForList, initPullToRefresh } from './components/pull-to-refresh.js';
import { FAB, createFAB, createSpeedDial, createExtendedFAB } from './components/fab.js';
import { SwipeActions } from './components/swipe-actions.js';
import { ViewTransitions, animatePageTransition, animateSharedElement, animateSharedElementBySelector, setTransitionName, clearTransitionName, skipTransition } from './components/view-transitions.js';


import { BaseConnector, PlatformStatus, SyncInterval } from './connectors/base-connector.js';
import { InstagramConnector } from './connectors/instagram-connector.js';
import { MetaAdsConnector } from './connectors/meta-ads-connector.js';
import { TikTokAdsConnector } from './connectors/tiktok-ads-connector.js';
import { ConnectionManager, connectionManager, PLATFORM_CONFIGS } from './connectors/connection-manager.js';

export const PRODUCT_COLORS = ['Bela', 'Crna', 'Navy', 'Siva', 'Bordeaux', 'Olive', 'Roza', 'Bež', 'Lavanda', 'Graphite'];
export const PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '36-40', '41-45', 'Standard 330ml', 'One Size'];

const ImperiumComponents = {
  Button, Input, Textarea, Select, Checkbox, Radio, Switch,
  Modal, Toast, ToastContainer,
  Table, Pagination,
  Dropdown, SelectDropdown, Tooltip, Popover,
  Sidebar, NavigationController, createSidebar, createNavigationController,
  Tabs, createTabs, initTabsFromDOM,
  Topbar, PageHeader,
  AlertBanner, AlertCenter,
  CommandPalette,
  StatusIndicator, PlatformCard, ConnectModal, QuickAccessShortcuts,
  BottomSheet, createActionSheet, createConfirmSheet, createSelectionSheet,
  PullToRefresh, createPullToRefreshForList, initPullToRefresh,
  BottomSheet: createActionSheet
};

export const Imperium = {
  Component,
  Store: ImperiumStore,
  Theme: ThemeManager,
  API: APIClient,
  App,
  Router,
  Storage: ImperiumStorage,
  SessionStorage: ImperiumSessionStorage,
  Utils: ImperiumUtils,
  Crypto: cryptoManager,
  
  services: {
    apiService,
    SectionAPI,
    APIMixin,
    useAPI,
    withAPI,
    cacheService,
    errorBoundary,
    performanceMonitor,
    realtimeService,
    CollaborativeEditor,
    analyticsService,
    multiTenantService,
    securityService
  },
  
  connectors: {
    BaseConnector,
    PlatformStatus,
    SyncInterval,
    InstagramConnector,
    MetaAdsConnector,
    TikTokAdsConnector,
    ConnectionManager,
    connectionManager,
    PLATFORM_CONFIGS
  },
  
  components: {
    Button,
    Input,
    Textarea,
    Select,
    Checkbox,
    Radio,
    Switch,
    Modal,
    Toast,
    ToastContainer,
    Table,
    Pagination,
    Dropdown,
    SelectDropdown,
    Tooltip,
    Popover,
    Sidebar,
    NavigationController,
    Tabs,
    Topbar,
    PageHeader,
    AlertBanner,
    AlertCenter,
    CommandPalette,
    StatusIndicator,
    PlatformCard,
    ConnectModal,
    QuickAccessShortcuts,
    BottomSheet,
    createActionSheet,
    createConfirmSheet,
    createSelectionSheet,
    PullToRefresh,
    createPullToRefreshForList,
    initPullToRefresh,
    FAB,
    createFAB,
    createSpeedDial,
    createExtendedFAB,
    SwipeActions,
    ViewTransitions,
    animatePageTransition,
    animateSharedElement,
    animateSharedElementBySelector,
    setTransitionName,
    clearTransitionName,
    skipTransition
  },
};

export default Imperium;
export { ThemeManager };