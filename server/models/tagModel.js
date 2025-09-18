import mongoose from "mongoose";

const TagSchema = mongoose.Schema(
  {
    tags: {
      type: [String],
      default: [
        "#technology", "#programming", "#gaming", "#art", "#music", 
        "#fitness", "#books", "#movies", "#travel", "#food", 
        "#photography", "#science", "#sports", "#fashion", "#health", 
        "#education", "#business", "#politics", "#environment", "#pets", 
        "#history", "#philosophy", "#coding", "#design", "#literature"
      ]
    }
  },
  {
    timestamps: true
  }
);

const TagModel = mongoose.model("Tags", TagSchema);

export default TagModel; 