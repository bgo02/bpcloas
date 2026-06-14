import { useState } from 'react';
import PeritoArea from '@/perito/PeritoArea';
import SecretariaArea from '@/secretaria/SecretariaArea';

type AppArea = 'perito' | 'secretaria';

export default function App() {
  const [area, setArea] = useState<AppArea>('perito');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Privacy warning — permanent */}
      <div className="bg-amber-50 border-b border-amber-300 px-4 py-2">
        <p className="max-w-4xl mx-auto text-xs text-amber-800">
          <strong>Aviso de privacidade:</strong> Os laudos exportados (PDF e JSON) contêm dados pessoais e de saúde protegidos por lei.
          Esta ferramenta <strong>não armazena nem transmite</strong> nenhum dado — tudo é processado localmente no seu navegador e apagado ao fechar ou recarregar a aba.
          A guarda, o sigilo e a juntada ao processo pelos meios oficiais são responsabilidade do usuário.
        </p>
      </div>

      <header className="bg-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-base font-bold">Instrumento Unificado de Avaliação Biopsicossocial</h1>
          <p className="text-xs text-slate-300">Resolução CNJ nº 630/2025 · preenchimento pericial e consolidação</p>
        </div>
      </header>

      {/* Area selector */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2">
          <button
            onClick={() => setArea('perito')}
            className={['px-4 py-1.5 rounded text-sm font-medium border',
              area === 'perito' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-gray-300 hover:bg-slate-50'].join(' ')}
          >
            I. Perito — Preenchimento do laudo
          </button>
          <button
            onClick={() => setArea('secretaria')}
            className={['px-4 py-1.5 rounded text-sm font-medium border',
              area === 'secretaria' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-gray-300 hover:bg-slate-50'].join(' ')}
          >
            II. Secretaria — Consolidação e certidão
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {area === 'perito' ? <PeritoArea /> : <SecretariaArea />}
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-6 text-xs text-slate-400">
        Ferramenta de apoio ao preenchimento pericial — Resolução CNJ nº 630/2025.
        Confira sempre os dados antes de assinar. Funciona offline; não requer conexão com a internet.
      </footer>
    </div>
  );
}
