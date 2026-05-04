import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image, mimeType, dishName, ingredients, step } = body;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = '';
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

    if (step === 'image' && image) {
      // Step 1: Analyze image
      prompt = `Analyze this food image and identify the food items. 
      If you can clearly identify the food, estimate the nutritional information.
      
      Return a JSON response with this EXACT structure (no markdown, just raw JSON):
      {
        "identified": true/false,
        "confidence": 0.0-1.0,
        "foodName": "name of the dish",
        "servingSize": "estimated serving size",
        "calories": estimated_calories_number,
        "protein": protein_grams_number,
        "carbs": carbs_grams_number,
        "fat": fat_grams_number,
        "fiber": fiber_grams_number,
        "needsInput": null or "dish_name" or "ingredients"
      }
      
      If you cannot clearly identify the food, set "identified" to false and "needsInput" to "dish_name".
      Only return the JSON, no other text.`;

      parts.push(
        { text: prompt },
        { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } }
      );
    } else if (step === 'dish_name' && dishName) {
      // Step 2: User provided dish name
      prompt = `The user has a dish called "${dishName}". 
      Estimate the nutritional information for a typical serving.
      
      Return a JSON response with this EXACT structure (no markdown, just raw JSON):
      {
        "identified": true,
        "confidence": 0.7,
        "foodName": "${dishName}",
        "servingSize": "estimated serving size",
        "calories": estimated_calories_number,
        "protein": protein_grams_number,
        "carbs": carbs_grams_number,
        "fat": fat_grams_number,
        "fiber": fiber_grams_number,
        "needsInput": null
      }
      
      If you cannot estimate for this dish name, set "needsInput" to "ingredients".
      Only return the JSON, no other text.`;

      parts.push({ text: prompt });

      if (image) {
        parts.push({ inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } });
      }
    } else if (step === 'ingredients' && ingredients) {
      // Step 3: User provided ingredients
      prompt = `The user has a dish made with these ingredients: ${ingredients}
      Estimate the nutritional information for a typical serving.
      
      Return a JSON response with this EXACT structure (no markdown, just raw JSON):
      {
        "identified": true,
        "confidence": 0.5,
        "foodName": "Custom dish",
        "servingSize": "estimated serving size",
        "calories": estimated_calories_number,
        "protein": protein_grams_number,
        "carbs": carbs_grams_number,
        "fat": fat_grams_number,
        "fiber": fiber_grams_number,
        "needsInput": null
      }
      
      Only return the JSON, no other text.`;

      parts.push({ text: prompt });
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const analysis = JSON.parse(jsonStr);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Calorie analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze food. Please try again.' },
      { status: 500 }
    );
  }
}
