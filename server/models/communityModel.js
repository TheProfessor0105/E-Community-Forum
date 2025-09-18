import mongoose from "mongoose";

const CommunitySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        description: {
            type: String,
            required: true
        },
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true
        },
        admins: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Users"
            }],
            default: []
        },
        members: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Users"
            }],
            default: []
        },
        tags: {
            type: [String],
            default: []
        },
        image: {
            type: String,
            default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyKLQ_NDd81udMvX8pB7D97hkZxbjehU6WzA&s"
        },
        coverImage: String,
        privacy: {
            type: String,
            enum: ['public', 'private', 'read-only'],
            default: 'public'
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for member count
CommunitySchema.virtual('membersCount').get(function() {
    // Ensure members is an array before accessing length
    return Array.isArray(this.members) ? this.members.length : 0;
});

const CommunityModel = mongoose.model("Communities", CommunitySchema);

export default CommunityModel;