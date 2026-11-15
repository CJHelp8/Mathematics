import React, { useRef, useState } from 'react';
import { Trash2, Upload, User } from 'lucide-react';

interface AvatarEditorProps {
  currentPhotoUrl: string;
  onSelectPhoto: (url: string) => Promise<void> | void;
}

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 192;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponível'));
          return;
        }
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export const AvatarEditor: React.FC<AvatarEditorProps> = ({
  currentPhotoUrl,
  onSelectPhoto,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploading(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      if (compressed.length > 115000) {
        setErrorMsg('Imagem muito grande mesmo após compressão.');
        return;
      }
      await onSelectPhoto(compressed);
    } catch {
      setErrorMsg('Não foi possível processar esta imagem.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3.5">
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt="Foto atual"
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-800 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
        )}

        <div className="flex-1 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {uploading
                ? 'Processando...'
                : currentPhotoUrl
                ? 'Trocar foto'
                : 'Escolher foto'}
            </span>
          </button>

          {currentPhotoUrl && (
            <button
              type="button"
              onClick={() => void onSelectPhoto('')}
              disabled={uploading}
              className="py-2 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover</span>
            </button>
          )}
        </div>
      </div>

      {!currentPhotoUrl && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Nenhuma foto selecionada. Você pode escolher uma imagem do seu dispositivo a qualquer momento.
        </p>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{errorMsg}</p>
      )}
    </div>
  );
};
