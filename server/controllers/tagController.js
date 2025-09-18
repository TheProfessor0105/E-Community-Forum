import TagModel from "../models/tagModel.js";
import fetch from "node-fetch";

// Get all tags for recommendations
export const getAllTags = async (req, res) => {
  try {
    // Look for the tag document - should only be one
    let tagDoc = await TagModel.findOne();
    
    // If no tag document exists, create one with default tags
    if (!tagDoc) {
      tagDoc = new TagModel();
      await tagDoc.save();
    }
    
    res.status(200).json(tagDoc.tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ message: "Failed to fetch tags", error: error.message });
  }
};

// Generate tags using Gemini API based on title and description
export const generateTags = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title && !description) {
      return res.status(400).json({ message: "Title or description is required" });
    }
    
    console.log("Generating tags for:", { title, description });
    
    const GEMINI_API_KEY = "AIzaSyDcQHD1FU5O-AQAtLVb8AZv8EGJg0pdWno";
    // Update to use gemini-1.5-flash model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const promptText = `Generate 5 relevant hashtag style tags (without explanation) for a community with ${title ? `title "${title}"` : ""} ${title && description ? "and" : ""} ${description ? `description: "${description}"` : ""}. Each tag should be a single word or short phrase, starting with a # symbol. Return only the tags as a comma-separated list.`;
    
    console.log("Prompt:", promptText);
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    };
    
    console.log("Request to Gemini API:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });
    
    // Log the entire response for debugging
    const responseText = await response.text();
    console.log("Raw Gemini API response:", responseText);
    
    // Parse the response text back to JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parsing Gemini API response:", parseError);
      return res.status(500).json({ message: "Failed to parse Gemini API response" });
    }
    
    // Handle potential errors from the Gemini API
    if (data.error) {
      console.error("Gemini API error:", data.error);
      return res.status(500).json({ 
        message: "Gemini API error", 
        error: data.error.message || "Unknown error"
      });
    }
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.length) {
      console.error("Unexpected Gemini API response format:", data);
      return res.status(500).json({ 
        message: "Unexpected Gemini API response format", 
        data
      });
    }
    
    const tagText = data.candidates[0].content.parts[0].text;
    console.log("Raw tags from Gemini:", tagText);
    
    // Extract tags from the response
    const generatedTags = tagText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag)
      .map(tag => tag.startsWith('#') ? tag : '#' + tag)
      .slice(0, 5);
    
    console.log("Processed tags:", generatedTags);
    
    // If we couldn't extract any tags, use some defaults based on the title
    if (!generatedTags.length) {
      const defaultTag = title ? `#${title.replace(/\s+/g, '')}` : "#community";
      generatedTags.push(defaultTag);
      if (description) {
        // Extract a second tag from the first word of description
        const secondWord = description.split(' ')[0];
        if (secondWord && secondWord.length > 3) {
          generatedTags.push(`#${secondWord.replace(/[^\w]/g, '')}`);
        }
      }
    }
    
    // Get the current tag document
    let tagDoc = await TagModel.findOne();
    
    // If no tag document exists, create one
    if (!tagDoc) {
      tagDoc = new TagModel();
    }
    
    // Check if any of the generated tags are new and should be added to collection
    let tagsUpdated = false;
    generatedTags.forEach(tag => {
      if (!tagDoc.tags.includes(tag)) {
        tagDoc.tags.push(tag);
        tagsUpdated = true;
      }
    });
    
    // Save if tags were updated
    if (tagsUpdated) {
      await tagDoc.save();
      console.log("Updated global tags collection with new tags");
    }
    
    res.status(200).json({ tags: generatedTags });
  } catch (error) {
    console.error("Error generating tags:", error);
    res.status(500).json({ 
      message: "Failed to generate tags", 
      error: error.message,
      stack: error.stack
    });
  }
}; 