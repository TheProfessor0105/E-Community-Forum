import mongoose from "mongoose";

const CommentSchema = mongoose.Schema(
  {
    content: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const PostSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Communities",
      required: true
    },
    likes: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
      }],
      default: []
    },
    dislikes: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
      }],
      default: []
    },
    comments: {
      type: [CommentSchema],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    image: String
  },
  {
    timestamps: true
  }
);

const PostModel = mongoose.model("Posts", PostSchema);
export default PostModel;