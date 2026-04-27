// Feature: Credit
// Story 14e-18a: Credit Feature Structure & State Hook
// Story 14e-18c: Credit Feature Orchestrator & App.tsx Integration
// This module contains credit/payment functionality

// State exports
export { useCreditState, type UseCreditStateResult, type CreditFirebaseServices } from './state';

// Handler exports (Story 14e-18b)
export {
  createBatchConfirmWithCreditCheck,
  createCreditWarningConfirm,
  createCreditWarningCancel,
  type CreditHandlerContext,
} from './handlers';

// Components (Story TD-15b-3)
export * from './components';

// Feature orchestrator exports (Story 14e-18c)
export {
  CreditFeature,
  useCreditFeature,
  type CreditFeatureContextValue,
  type CreditFeatureProps,
} from './CreditFeature';
