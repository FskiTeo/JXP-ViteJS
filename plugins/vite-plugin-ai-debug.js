import OpenAI from "openai";
import path from "path";
import * as esprima from 'esprima';
import fs from 'fs/promises';

const vitePluginAiDebug = (options = {}) => {
    const openai = new OpenAI({apiKey: options.apiKey})

    const debugOutputDir = path.resolve(process.cwd(), '.debug-output');

    async function ensureOutputDir() {
        try {
            await fs.mkdir(debugOutputDir, {recursive: true});
        } catch (error) {
            console.error('Erreur création dossier:', error);
        }
    }

    async function analyzeWithAI(errorMessage, code, fileName) {
        const prompt = `Un développeur junior vous demande de l'aide pour résoudre un problème dans son code.
        Il a cette erreur : \"${errorMessage}\" et il vous montre ce code :
        \`\`\`javascript
        ${code}
        \`\`\``;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini', messages: [{
                    role: 'system',
                    content: 'Vous êtes un développeur web expérimenté en JavaScript et en technologies du web.'
                }, {role: 'user', content: prompt}], max_tokens: 2048
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Erreur OpenAI:', error);
            return null;
        }
    }

    async function saveResponse(fileName, error, response) {
        const outputFile = path.join(debugOutputDir, `debug_${path.basename(fileName)}_${Date.now()}.md`);

        const content = `## Informations sur l'erreur :
Fichier: ${fileName}\
Erreur: ${error}
---
## Solution proposée par l'IA :
${response}`;

        await fs.writeFile(outputFile, content, 'utf-8');
    }

    return {
        name: 'vite-plugin-ai-debug',

        async buildStart() {
            await ensureOutputDir();
        },

        async transform(code, id) {
            if (!id.endsWith('.js')) return null;

            try {
                esprima.parseScript(code);
            } catch (error) {
                console.error(`\nErreur détectée dans ${id}:`);
                console.error(error.message);

                const aiResponse = await analyzeWithAI(error.message, code, id);

                if (aiResponse) {
                    await saveResponse(id, error.message, aiResponse);

                    // Afficher la réponse dans la console
                    console.log('\nSolution proposée par l\'IA:');
                    console.log(aiResponse);

                    // Injecter un script pour afficher l'erreur dans les DevTools
                    const debugScript = `
                        console.error("[Erreur JS]", ${JSON.stringify(error.message)});
                        console.info("[Solution IA]", Check \/.debug-output\/ for more details.);
                    `;

                    return {
                        code: `${code}\n${debugScript}`, map: null
                    };
                }
            }

            return null;
        }
    };
}

export default vitePluginAiDebug;