
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Message, Role, GeminiModel, Attachment, ImageSize } from "../types";

export class GeminiService {
  async *streamChat(
    model: GeminiModel,
    history: Message[],
    systemInstruction: string,
    useSearch: boolean,
    imageSize: ImageSize = '1K'
  ) {
    // CRITICAL: Must use a named parameter { apiKey: process.env.API_KEY }.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const isImageModel = model.includes('image');
    const isProImage = model === 'gemini-3-pro-image-preview';

    const lastMessage = history[history.length - 1];
    const promptParts: any[] = [{ text: lastMessage.content }];
    
    if (lastMessage.attachments) {
      lastMessage.attachments.forEach(att => {
        promptParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      });
    }

    if (isImageModel) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts: promptParts },
          config: { 
            systemInstruction,
            // Google Search is only available for text-based outputs or gemini-3-pro-image-preview
            tools: isProImage && useSearch ? [{ googleSearch: {} }] : undefined,
            imageConfig: { 
              aspectRatio: "1:1", 
              imageSize: isProImage ? imageSize : "1K" 
            }
          }
        });

        const resAttachments: Attachment[] = [];
        let resText = "";

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const base64 = part.inlineData.data;
            const mime = part.inlineData.mimeType || 'image/png';
            resAttachments.push({
              mimeType: mime,
              data: base64,
              url: `data:${mime};base64,${base64}`
            });
          } else if (part.text) {
            resText += part.text;
          }
        }

        yield { 
          text: resText || (resAttachments.length > 0 ? "" : "已完成生成。"), 
          attachments: resAttachments,
          groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            title: chunk.web?.title || '來源網頁',
            uri: chunk.web?.uri
          })).filter((s: any) => s.uri)
        };
      } catch (e: any) {
        if (e.message?.includes("Requested entity was not found")) {
          throw new Error("模型請求失敗。Nano Banana Pro 需使用已啟用結算的 API 金鑰。");
        }
        throw e;
      }
      return;
    }

    // Text-based chat session
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      },
    });

    const responseStream = await chat.sendMessageStream({
      message: { parts: promptParts }
    });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      yield {
        text: c.text,
        groundingSources: c.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || '搜尋資料',
          uri: chunk.web?.uri
        })).filter((s: any) => s.uri)
      };
    }
  }
}

export const geminiService = new GeminiService();
