import {defineConfig} from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import {componentTagger} from "pp-tagger";

// DDoS Guard требует двусторонний app-level keepalive чаще 30s.
// Сервер: text-frame {type:'ping'} каждые 5-9s (рандом — чтобы DDoS Guard
// не триггерился на одинаковые интервалы; Vite-клиент игнорирует, case "ping": break;).
// Клиент: server.hmr.timeout = 7000 ниже понижает pingInterval @vite/client до 7s.
const hmrKeepalive = {
    name: 'hmr-ws-keepalive',
    configureServer(server: any) {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const tick = () => {
            server.ws?.send({type: 'ping'});
            timer = setTimeout(tick, 5000 + Math.floor(Math.random() * 4000));
        };
        timer = setTimeout(tick, 5000 + Math.floor(Math.random() * 4000));
        server.httpServer?.on('close', () => {
            if (timer) clearTimeout(timer);
        });
    },
};

const buildManifest = {
    name: 'build-files-manifest',
    apply: 'build' as const,
    closeBundle() {
        const outDir = path.resolve(__dirname, 'dist');
        if (!fs.existsSync(outDir)) return;
        const files: string[] = [];
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else files.push(path.relative(outDir, full).split(path.sep).join('/'));
            }
        };
        walk(outDir);
        const list = files.filter((f) => f !== 'build-files.json' && !f.endsWith('.zip'));
        fs.writeFileSync(path.join(outDir, 'build-files.json'), JSON.stringify({builtAt: new Date().toISOString(), files: list}));
    },
};

// https://vitejs.dev/config/
export default defineConfig(({mode}) => ({
    plugins: [
        react(),
        hmrKeepalive,
        buildManifest,
        mode === 'development' &&
        componentTagger(),
    ].filter(Boolean),
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: true,
        hmr: {
            overlay: false, // Disables the error overlay if you only want console errors
            timeout: 7000, // pingInterval @vite/client — нужен <30s для DDoS Guard
        }
    },
}));
