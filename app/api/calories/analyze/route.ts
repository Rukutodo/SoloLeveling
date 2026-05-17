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
    const { image, mimeType, dishName, ingredients, step, quantity, baseFood } = body;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = '';
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

    if (step === 'image' && image) {
      // Step 1: Analyze image
      prompt = `Analyze this food image and identify the food items. 
      Estimate standard metrics including SUGAR (in grams) and CAFFEINE (in milligrams) where applicable.
      
      If the food is a packaged product (like instant noodles, chips, biscuits, chocolates, soda cans, energy drinks, tea, coffee, energy bars), a fast-food item (like burgers, pizzas, fries, tacos, pasta, wings, sugary beverages), or if the quantity/portion size is not clear:
      - Set "needsInput" to "quantity"
      - Provide a friendly user question in "quantityQuestion" asking what the quantity or package/portion size is.
      - For fast food, ask explicitly for portion size in standard servings, slices, cups, or grams.
      - Keep "foodName" set as the identified brand/product/dish name.
      
      Otherwise, if you can clearly identify the food and its portion size, estimate the nutritional information directly.
      
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
        "sugar": sugar_grams_number,
        "caffeine": caffeine_milligrams_number,
        "needsInput": null or "dish_name" or "ingredients" or "quantity",
        "quantityQuestion": null or "specific question about quantity"
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
      Estimate standard metrics including SUGAR (in grams) and CAFFEINE (in milligrams, e.g. for coffees, teas, sodas, energy drinks) where applicable.
      
      If this is a packaged food product (like chips, sodas, biscuits, chocolates, energy drinks, bars), a fast-food item (like burgers, pizzas, fries, tacos, pasta, wings, milkshakes, soda cups), or if the quantity/portion size is not clear:
      - Set "needsInput" to "quantity"
      - Provide a friendly user question in "quantityQuestion" asking what the quantity or package/portion size is (e.g. "What was the portion size? (e.g. 1 slice, 2 cups, 250g, 1 burger, 1 can)").
      - Keep "foodName" set to "${dishName}".
      
      Otherwise, estimate the nutritional information for a typical serving.
      
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
        "sugar": sugar_grams_number,
        "caffeine": caffeine_milligrams_number,
        "needsInput": null or "quantity",
        "quantityQuestion": null or "specific question about quantity"
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
      Estimate the nutritional information for a typical serving including SUGAR (in grams) and CAFFEINE (in milligrams) where applicable.
      
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
        "sugar": sugar_grams_number,
        "caffeine": caffeine_milligrams_number,
        "needsInput": null
      }
      
      Only return the JSON, no other text.`;

      parts.push({ text: prompt });
    } else if (step === 'quantity' && quantity && baseFood) {
      // Step 4: User provided custom quantity input
      prompt = `The user has specified the quantity/size of "${baseFood}" as: "${quantity}".
      Calculate the exact nutritional breakup based on this quantity.
      Ensure all metrics including SUGAR (in grams) and CAFFEINE (in milligrams, e.g. for coffee, tea, cola, energy drinks) are calculated proportionally and accurately.
      
      Return a JSON response with this EXACT structure (no markdown, just raw JSON):
      {
        "identified": true,
        "confidence": 0.95,
        "foodName": "${baseFood}",
        "servingSize": "${quantity}",
        "calories": calculated_calories_number,
        "protein": calculated_protein_grams_number,
        "carbs": calculated_carbs_grams_number,
        "fat": calculated_fat_grams_number,
        "fiber": calculated_fiber_grams_number,
        "sugar": calculated_sugar_grams_number,
        "caffeine": calculated_caffeine_milligrams_number,
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
