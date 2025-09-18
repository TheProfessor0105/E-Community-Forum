import CommunityModel from "../models/communityModel.js";
import UserModel from "../models/userModel.js"
import cloudinary from "../config/cloudinary.js";
import fs from 'fs';
import PostModel from "../models/postModel.js";
import { addNotification } from "./notificationController.js";

// create community

export const createCommunity = async(req, res) => {
    try {
      // Get authorId from request body or from the authenticated user
      let { authorId } = req.body;
      
      // If authorId is not provided, use the authenticated user's ID
      if (!authorId && req.user) {
        authorId = req.user.id;
        req.body.authorId = authorId; // Add to request body for the model
      }
      
      // Validate if authorId exists
      if (!authorId) {
        return res.status(400).json({ message: "Author ID is required" });
      }

      // Create community data object
      const communityData = {
        ...req.body
      };
      
      // Process tags if they exist
      if (req.body.tags) {
        try {
          // If tags is a JSON string, parse it
          communityData.tags = typeof req.body.tags === 'string' 
            ? JSON.parse(req.body.tags) 
            : req.body.tags;
            
          // Ensure tags is an array and limit to 5 tags
          if (!Array.isArray(communityData.tags)) {
            communityData.tags = [];
          } else {
            communityData.tags = communityData.tags.slice(0, 5);
          }
          
          console.log("Processing tags:", communityData.tags);
        } catch (parseError) {
          console.error("Error parsing tags:", parseError);
          communityData.tags = [];
        }
      }

      // Process logo image upload if it exists
      if (req.files && req.files.logo) {
        try {
          const logoResult = await cloudinary.uploader.upload(req.files.logo[0].path, {
            folder: 'communities/logos',
            resource_type: 'image'
          });
          
          communityData.image = logoResult.secure_url;
          
          // Clean up the local file
          fs.unlinkSync(req.files.logo[0].path);
        } catch (uploadError) {
          console.error("Error uploading logo to Cloudinary:", uploadError);
          // Continue without the logo if Cloudinary upload fails
        }
      }

      // Process cover image upload if it exists
      if (req.files && req.files.coverImage) {
        try {
          const coverResult = await cloudinary.uploader.upload(req.files.coverImage[0].path, {
            folder: 'communities/covers',
            resource_type: 'image'
          });
          
          communityData.coverImage = coverResult.secure_url;
          
          // Clean up the local file
          fs.unlinkSync(req.files.coverImage[0].path);
        } catch (uploadError) {
          console.error("Error uploading cover image to Cloudinary:", uploadError);
          // Continue without the cover image if Cloudinary upload fails
        }
      }

      const newCommunity = new CommunityModel(communityData);
      await newCommunity.save();
      
      // Update community to add author as admin and member
      await CommunityModel.updateOne(
        { _id: newCommunity._id },
        { 
            $push: { 
                admins: authorId, 
                members: authorId 
            }
        }
      );
      
      // Update user to add community to their collections
      const author = await UserModel.findById(authorId);
      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }
      
      await author.updateOne({
        $push: {
          myCommunities: newCommunity._id,
          joinedCommunities: newCommunity._id
        }
      });
      
      res.status(201).json(newCommunity);
    }
    catch(err) {
        console.error("Error creating community:", err);
        
        // Clean up any uploaded files if there was an error
        if (req.files) {
          if (req.files.logo && req.files.logo[0] && fs.existsSync(req.files.logo[0].path)) {
            fs.unlinkSync(req.files.logo[0].path);
          }
          if (req.files.coverImage && req.files.coverImage[0] && fs.existsSync(req.files.coverImage[0].path)) {
            fs.unlinkSync(req.files.coverImage[0].path);
          }
        }
        
        res.status(500).json({ message: err.message });
    }
}

// delete Community 

export const deleteCommunity = async(req,res)=>{
  const communityId = req.params.id;
  const {userId} = req.body;
  try{
    const community = await CommunityModel.findById(communityId);
    if (!community) {
      return res.status(404).json({message: "Community not found"});
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({message: "User not found"});
    }
    
    // Compare as strings to ensure proper comparison of ObjectIds
    if (community.authorId.toString() === userId.toString()){
      // Notify all members about community deletion
      for (const memberId of community.members) {
        if (memberId !== userId) { // Don't notify the author who's deleting
          await addNotification(memberId, {
            type: 'community_deleted',
            message: `The community "${community.name}" has been deleted`,
            communityName: community.name
          });
        }
      }
      
      // Delete posts in the community
      await PostModel.deleteMany({ community: communityId });
      
      // Delete the community
      await CommunityModel.findByIdAndDelete(communityId);
      
      // Remove from the author's communities
      await user.updateOne({$pull:{myCommunities:communityId}});
      
      // Remove from all users' joined communities
      await UserModel.updateMany(
        {joinedCommunities: communityId},
        {$pull: {joinedCommunities: communityId}}
      );
      
      return res.status(200).json({message: "Community deleted successfully"});
    }
    else{
      return res.status(403).json({message: "Action forbidden: Only the community author can delete it"});
    }
  }
  catch(err){
    console.error("Error deleting community:", err);
    return res.status(500).json({message: err.message});
  }
}



// get Community

export const getCommunity = async (req, res) => {
    const id = req.params.id;
  
    try {
      const community = await CommunityModel.findById(id);
      res.status(200).json(community);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
};

// get all communities

// 
// export const getAllCommunities = async (req, res) => {
//   try {
//     const community = await CommunityModel.find();
//     res.status(200).json(community);
//   } catch (error) {
//     res.status(500).json({"hghj":"hghgh"});
//   }
// };
export const getAllCommunities = async (req, res) => {
  try {
    // Find the communities
    const communities = await CommunityModel.find();
    
    // Ensure we're returning an array even if no communities are found
    const communitiesArray = Array.isArray(communities) ? communities : [];
    
    // Return the result
    res.status(200).json(communitiesArray);
  } catch (error) {
    console.error("Error fetching communities:", error);
    res.status(500).json({ 
      message: "Failed to fetch communities", 
      error: error.message 
    });
  }
};




// Update a community
// export const updateCommunity = async (req, res) => {
//     const communityId = req.params.id;
//     const { userId } = req.body;
  
//     try {
//       const community = await PostModel.findById(communityId);
//       if (community.admins.includes(userId)) {
//         await post.updateOne({ $set: req.body });
//         res.status(200).json("Post Updated");
//       } else {
//         res.status(403).json("Action forbidden");
//       }
//     } catch (error) {
//       res.status(500).json(error);
//     }
//   };


// join a member

export const joinCommunity = async (req,res) => {
    const communityId = req.params.id;
    const { userId } = req.body;

    try{
        const community = await CommunityModel.findById(communityId);
        const user = await UserModel.findById(userId);
        if(community.members.includes(userId)){
          res.status(200).json({message : "user is already in community"})
          return;
        }
        await community.updateOne({$push: {members: userId}});
        await user.updateOne({$push : {joinedCommunities: communityId}});
        
        // Notify community admins about new member
        for (const adminId of community.admins) {
          if (adminId !== userId) { // Don't notify the user who joined
            await addNotification(adminId, {
              type: 'new_member',
              message: `New member joined your community "${community.name}"`,
              communityId: communityId,
              communityName: community.name,
              memberId: userId,
              memberName: `${user.firstname} ${user.lastname}`
            });
          }
        }
        
        res.status(200).json({message: "user join the community"})
    }
    catch(err){
        res.status(500).json({message: err.message});
    }
}


// remove a member 

export const removeMember = async (req, res) => {
    const communityId = req.params.id;
    const { userId, member } = req.body;

    try {
      const community = await CommunityModel.findById(communityId);
      const removedMember = await UserModel.findById(member);
      if (community.admins.includes(userId) && (member != community.authorId)) {
        if(community.admins.includes(member)){
           await community.updateOne({ $pull : {members: member,admins: member} });
           await removedMember.updateOne({$pull: {joinedCommunities: communityId}})
         }
         else{
           await community.updateOne({ $pull : {members: member} });
           await removedMember.updateOne({$pull: {joinedCommunities: communityId}})
         }
        
        // Send notification to the removed member
        await addNotification(member, {
          type: 'community_removal',
          message: `You have been removed from the community "${community.name}"`,
          communityId: communityId,
          communityName: community.name
        });
        
        res.status(200).json("member removed");
      } else {
        res.status(403).json("Action forbidden");
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
};


  // leaveCommunity

  export const leaveCommunity = async(req,res)=>{
    const communityId = req.params.id;
    const {userId} = req.body;
    
    try {
      console.log("Leave community request:", { communityId, userId });
      
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({message: "User not found"});
      }
      
      const community = await CommunityModel.findById(communityId);
      if (!community) {
        return res.status(404).json({message: "Community not found"});
      }
      
      // Compare IDs as strings
      const isAuthor = community.authorId.toString() === userId.toString();
      console.log("Leave check:", { 
        authorId: community.authorId.toString(), 
        userId: userId.toString(),
        isAuthor
      });
      
      // If user is the author
      if (isAuthor) {
        // Check if there are other admins
        const otherAdmins = community.admins.filter(
          adminId => adminId.toString() !== userId.toString()
        );
        
        console.log("Author leaving check:", {
          adminsCount: community.admins.length,
          otherAdminsCount: otherAdmins.length
        });
        
        if (otherAdmins.length > 0) {
          // Promote another admin to author
          const newAuthorId = otherAdmins[0];
          
          console.log("Promoting new author:", newAuthorId.toString());
          
          // Remove user from admins and members
          await community.updateOne({
            $pull: { admins: userId, members: userId },
            $set: { authorId: newAuthorId }
          });
          
          // Remove community from user's joined and owned communities
          await user.updateOne({
            $pull: {
              joinedCommunities: communityId,
              myCommunities: communityId
            }
          });
          
          return res.status(200).json({
            message: "You have left the community. Another admin has been promoted to community author."
          });
        } else {
          // Author cannot leave if there are no other admins
          return res.status(400).json({
            message: "As the only admin, you cannot leave this community. Please promote another member to admin first, or delete the community."
          });
        }
      } 
      // If user is an admin but not the author
      else if (community.admins.includes(userId)) {
        // Remove user from admins and members
        await community.updateOne({
          $pull: { admins: userId, members: userId }
        });
        
        // Remove community from user's joined communities
        await user.updateOne({
          $pull: { joinedCommunities: communityId }
        });
        
        return res.status(200).json({
          message: "You have left the community and are no longer an admin."
        });
      } 
      // If user is a regular member
      else if (community.members.includes(userId)) {
        // Remove user from members
        await community.updateOne({
          $pull: { members: userId }
        });
        
        // Remove community from user's joined communities
        await user.updateOne({
          $pull: { joinedCommunities: communityId }
        });
        
        return res.status(200).json({
          message: "You have left the community."
        });
      } else {
        return res.status(400).json({
          message: "You are not a member of this community."
        });
      }
    } catch (err) {
      console.error("Error leaving community:", err);
      return res.status(500).json({message: err.message});
    }
  }





  // make admin 

  export const makeAdmin = async (req,res) => {
    const communityId = req.params.id;
    const { userId , member } = req.body;

    try{
        const community = await CommunityModel.findById(communityId);
        if(community.admins.includes(userId) && !community.admins.includes(member)){
          await community.updateOne({$push: {admins: member}});
          
          // Send notification to the promoted member
          await addNotification(member, {
            type: 'admin_promotion',
            message: `You have been promoted to admin in the community "${community.name}"`,
            communityId: communityId,
            communityName: community.name
          });
          
          res.status(200).json({message: "member made the admin"});
        }
        else{
          res.status(500).json({message: "action forbidden"});
        }
    }
    catch(err){
        res.status(500).json({message: err.message});
    }
}

// Get communities for a user
export const getUserCommunities = async (req, res) => {
  const { userId } = req.params;
  
  try {
    const communities = await CommunityModel.find({
      $or: [
        { authorId: userId },
        { members: userId },
        { admins: userId }
      ]
    });
    
    res.status(200).json(communities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get members of a community with detailed information
export const getCommunityMembers = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the community
    const community = await CommunityModel.findById(id);
    
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }
    
    // Get detailed information for each member
    const memberIds = community.members || [];
    const members = await UserModel.find({ _id: { $in: memberIds } });
    
    // Add isAdmin flag to each member
    const membersWithDetails = members.map(member => {
      const memberObj = member.toObject();
      memberObj.isAdmin = community.admins.includes(member._id.toString());
      return memberObj;
    });
    
    res.status(200).json(membersWithDetails);
  } catch (error) {
    console.error("Error fetching community members:", error);
    res.status(500).json({ message: error.message });
  }
};

// Demote an admin to a regular member
export const demoteAdmin = async (req, res) => {
  const communityId = req.params.id;
  const { userId, member } = req.body;

  try {
    console.log('Demote admin request:', { communityId, userId, member });
    const community = await CommunityModel.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }
    
    console.log('Community author check:', { 
      authorId: community.authorId, 
      userId, 
      isMatch: community.authorId === userId,
      authorIdType: typeof community.authorId,
      userIdType: typeof userId
    });
    
    // Check if user is authorized (must be author to demote admins)
    // Convert IDs to strings for comparison
    if (community.authorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the community author can demote admins" });
    }
    
    // Check if member is an admin (convert to string for comparison)
    if (!community.admins.includes(member)) {
      return res.status(400).json({ message: "The user is not an admin" });
    }
    
    // Cannot demote the author (convert to string for comparison)
    if (member.toString() === community.authorId.toString()) {
      return res.status(400).json({ message: "Cannot demote the community author" });
    }
    
    console.log('Demoting admin:', member);
    
    // Remove from admins but keep in members
    await community.updateOne({ $pull: { admins: member } });
    
    // Send notification to the demoted member
    await addNotification(member, {
      type: 'admin_demotion',
      message: `You have been removed as an admin from the community "${community.name}"`,
      communityId: communityId,
      communityName: community.name
    });
    
    res.status(200).json({ message: "Admin demoted to regular member" });
  } catch (error) {
    console.error("Error demoting admin:", error);
    res.status(500).json({ message: error.message });
  }
};

