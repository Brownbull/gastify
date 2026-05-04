import { Progress } from '../../atoms/Progress';
import { Spinner } from '../../atoms/Spinner';

interface ScanProgressProps {
  uploadProgress: number;
  extractionProgress?: number;
  stage: 'uploading' | 'extracting' | 'complete';
  uploadLabel?: string;
  extractionLabel?: string;
  stageLabel?: string;
  className?: string;
}

export function ScanProgress({
  uploadProgress,
  extractionProgress,
  stage,
  uploadLabel = 'Upload',
  extractionLabel = 'Extraction',
  stageLabel,
  className = '',
}: ScanProgressProps) {
  return (
    <div className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {uploadLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {Math.round(uploadProgress)}%
          </span>
        </div>
        <Progress value={uploadProgress} size="sm" color={stage === 'uploading' ? 'primary' : 'green'} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {extractionLabel}
          </span>
          {stage === 'extracting' && <Spinner size="sm" color="primary" />}
          {extractionProgress !== undefined && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {Math.round(extractionProgress)}%
            </span>
          )}
        </div>
        <Progress
          value={stage === 'extracting' ? extractionProgress : stage === 'complete' ? 100 : 0}
          size="sm"
          color={stage === 'complete' ? 'green' : 'primary'}
        />
      </div>
      {stageLabel && (
        <div className="flex items-center gap-2">
          {stage !== 'complete' && <Spinner size="sm" color="gray" />}
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {stageLabel}
          </span>
        </div>
      )}
    </div>
  );
}
