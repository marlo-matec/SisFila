
import { useState, useCallback, useEffect } from 'react';
import { SystemInfo, PrinterConfig } from '../types';

export function useSystemInfo(apiBase: string) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/license`);
      if (!res.ok) throw new Error('Falha na resposta da API');
      const data = await res.json();
      setSystemInfo(data);
    } catch (err) {
      console.warn("Offline: Info de licença indisponível.");
    }

    try {
      const res = await fetch(`${apiBase}/api/printer-config`);
      if (!res.ok) throw new Error('Falha');
      const data = await res.json();
      setPrinterConfig(data);
    } catch (err) {
      console.warn("Offline: Impressora indisponível");
    }
  }, [apiBase]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return { systemInfo, setSystemInfo, printerConfig, setPrinterConfig, refresh: fetchInfo };
}
