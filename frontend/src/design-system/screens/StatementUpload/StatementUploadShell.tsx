import { Upload, AlertCircle } from 'lucide-react';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Button } from '../../atoms/Button';
import { Progress } from '../../atoms/Progress';

type StatementUploadState = 'default' | 'uploading' | 'error';

interface StatementUploadShellProps {
  state?: StatementUploadState;
  uploadProgress?: number;
  errorMessage?: string;
  title?: string;
  submitLabel?: string;
  onRetry?: () => void;
}

const BANK_OPTIONS = [
  { value: 'bchile', label: 'Banco de Chile' },
  { value: 'bestado', label: 'BancoEstado' },
  { value: 'santander', label: 'Santander' },
  { value: 'bci', label: 'BCI' },
] as const;

export function StatementUploadShell({
  state = 'default',
  uploadProgress = 45,
  errorMessage = 'The file could not be processed. Check the format and try again.',
  title = 'Upload statement',
  submitLabel = 'Upload',
  onRetry,
}: StatementUploadShellProps) {
  return (
    <div
      style={{
        padding: '24px 16px',
        backgroundColor: 'var(--background)',
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '24px',
        }}
      >
        {title}
      </h1>

      <form
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        onSubmit={(e) => e.preventDefault()}
      >
        <Select
          label="Bank"
          options={BANK_OPTIONS}
          placeholder="Select bank"
        />

        {/* File upload area */}
        <div>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}
          >
            File
          </p>

          {state === 'uploading' ? (
            <div
              style={{
                padding: '32px 16px',
                border: '2px solid var(--primary)',
                borderRadius: '12px',
                backgroundColor: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Upload size={32} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                Uploading...
              </p>
              <div style={{ width: '100%', maxWidth: 240 }}>
                <Progress value={uploadProgress} size="md" color="primary" />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {uploadProgress}%
              </p>
            </div>
          ) : (
            <div
              style={{
                padding: '32px 16px',
                border: `2px dashed ${state === 'error' ? 'var(--error)' : 'var(--border)'}`,
                borderRadius: '12px',
                backgroundColor: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Upload
                size={32}
                style={{ color: state === 'error' ? 'var(--error)' : 'var(--text-tertiary)' }}
                aria-hidden="true"
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Select file
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                PDF, CSV or XLS
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {state === 'error' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
            }}
            role="alert"
          >
            <AlertCircle
              size={16}
              style={{ color: 'var(--error)', flexShrink: 0, marginTop: 2 }}
              aria-hidden="true"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--error)' }}>
                {errorMessage}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input label="Start date" type="date" />
          <Input label="End date" type="date" />
        </div>

        <div style={{ marginTop: '8px' }}>
          <Button
            type="submit"
            style={{ width: '100%' }}
            disabled={state === 'uploading'}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
