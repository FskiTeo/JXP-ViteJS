import { defineConfig } from 'vite'
import vitePluginAiDebug from './plugins/vite-plugin-ai-debug'
import dotenv from 'dotenv'

dotenv.config({path: '.env'});

export default defineConfig({
    plugins: [
        vitePluginAiDebug({
            apiKey: process.env.VITE_OPENAI_API_KEY
        })
    ],
    server:{
        watch: {
            excluded: ['.debug-output/**']
        }
    }
});