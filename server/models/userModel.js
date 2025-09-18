import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true
        },
        email: {
            type: String,
            required: false,
            unique: true,
            sparse: true
        },
        password: {
            type: String,
            required: true
        },
        firstname: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        avatar: {
            type: String,
            default: ""
        },
        coverPicture: String,
        about: String,
        livesin: String,
        friends: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        }],
        friendRequests: [{
            from: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Users"
            },
            to: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Users"
            },
            status: {
                type: String,
                enum: ['pending', 'accepted', 'rejected'],
                default: 'pending'
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        sentFriendRequests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        }],
        joinedCommunities: [],
        myCommunities: [],
        notifications: {
            type: Array,
            default: []
        }
    },
    {timestamps: true}
)

const UserModel = mongoose.model("Users", UserSchema);
export default UserModel;