import { createContext, useCallback, useContext, useRef, useState } from 'react';
import PasswordInput from './PasswordInput';

const ConfirmContext = createContext(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export default function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  // state: { kind: 'confirm'|'prompt', title, message, danger, inputType, defaultValue }
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const resolver = useRef(null);

  const confirm = useCallback(({ title = 'Are you sure?', message = '', danger = false } = {}) => {
    setState({ kind: 'confirm', title, message, danger });
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  // validate(value) → error string or ''. If it returns an error the dialog
  // stays open and shows it in red instead of accepting the value.
  const promptFor = useCallback(({ title = 'Enter a value', message = '', inputType = 'text', defaultValue = '', validate } = {}) => {
    setState({ kind: 'prompt', title, message, inputType, validate });
    setInputValue(defaultValue);
    setInputError('');
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const notify = useCallback(({ title = 'Notice', message = '' } = {}) => {
    setState({ kind: 'alert', title, message });
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const submitPrompt = () => {
    const err = state?.validate ? state.validate(inputValue) : '';
    if (err) { setInputError(err); return; }
    close(inputValue);
  };

  const close = (result) => {
    setState(null);
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt: promptFor, notify }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5">
            <h3 className="font-bold text-ink-900 text-lg mb-1">{state.title}</h3>
            {state.message && <p className="text-sm text-gray-500 mb-4">{state.message}</p>}

            {state.kind === 'prompt' && (
              state.inputType === 'password' ? (
                <PasswordInput
                  autoFocus
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setInputError(''); }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && submitPrompt()}
                />
              ) : (
                <input
                  autoFocus
                  type={state.inputType}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setInputError(''); }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && submitPrompt()}
                />
              )
            )}

            {state.kind === 'prompt' && (
              <p className={`text-red-500 text-xs mt-1 mb-3 ${inputError ? '' : 'hidden'}`}>{inputError}</p>
            )}
            {state.kind === 'prompt' && !inputError && <div className="mb-4" />}

            <div className="flex justify-end gap-2">
              {state.kind !== 'alert' && (
                <button onClick={() => close(state.kind === 'confirm' ? false : null)} className="px-4 py-2 text-sm text-gray-500 font-medium rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
              )}
              <button
                onClick={() => (state.kind === 'prompt' ? submitPrompt() : close(true))}
                className={`px-4 py-2 text-sm text-white font-medium rounded-lg ${state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
              >
                {state.kind === 'alert' ? 'OK' : state.kind === 'confirm' ? 'Confirm' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
