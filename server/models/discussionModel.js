import mongoose from "mongoose";

const MessageSchema = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

const DiscussionSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users"
    }],
    messages: [MessageSchema],
    isActive: {
      type: Boolean,
      default: true
    },
    maxParticipants: {
      type: Number,
      default: 50
    },
    tags: [{
      type: String,
      trim: true
    }],
    category: {
      type: String,
      enum: ['general', 'tech', 'business', 'entertainment', 'sports', 'politics', 'other'],
      default: 'general'
    }
  },
  { timestamps: true }
);

// Index for better query performance
DiscussionSchema.index({ title: 'text', description: 'text' });
DiscussionSchema.index({ category: 1, isActive: 1 });
DiscussionSchema.index({ participants: 1 });

const DiscussionModel = mongoose.model("Discussions", DiscussionSchema);
export default DiscussionModel;
