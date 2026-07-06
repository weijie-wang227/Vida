import { Router } from "express";
import { findAuthenticatedUser } from "../auth.js";
import {
  ChatModel,
  CommentModel,
  FeedPostModel,
  FriendshipModel,
  LikeModel,
} from "../models/VidaData.js";
import { serializeComment, serializeFeedPost } from "../serializers.js";

const router = Router();
const maxCaptionLength = 1200;
const maxCommentLength = 500;
const maxImageUrlLength = 4096;
const maxDurationMinutes = 24 * 60;
const validCategories = new Set([
  "physical",
  "social",
  "cognitive",
  "creative",
]);

function asObject(doc: Record<string, any>) {
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (category): category is string =>
          typeof category === "string" && validCategories.has(category),
      ),
    ),
  );
}

async function nextMockId() {
  const lastPost = await FeedPostModel.findOne()
    .sort({ mockId: -1 })
    .select("mockId");

  return (lastPost?.mockId ?? 0) + 1;
}

async function findVisibleUserIds(user: Record<string, any>) {
  const friendships = await FriendshipModel.find({ userId: user._id }).select(
    "friendId",
  );

  return [
    user._id,
    ...friendships.map((friendship: Record<string, any>) => friendship.friendId),
  ];
}

async function findVisibleFeedPost(postId: number, user: Record<string, any>) {
  if (!Number.isInteger(postId)) {
    return null;
  }

  const visibleUserIds = await findVisibleUserIds(user);

  return FeedPostModel.findOne({
    mockId: postId,
    user: { $in: visibleUserIds },
  })
    .populate("user")
    .populate("activity")
    .populate("group");
}

async function findOwnedFeedPost(postId: number, user: Record<string, any>) {
  if (!Number.isInteger(postId)) {
    return null;
  }

  return FeedPostModel.findOne({
    mockId: postId,
    user: user._id,
  })
    .populate("user")
    .populate("activity")
    .populate("group");
}

function getPostLikeCount(post: Record<string, any>) {
  const item = asObject(post);

  return Number(item.likesCount ?? 0);
}

async function ensurePostLikeCount(post: Record<string, any>) {
  const item = asObject(post);
  const update: Record<string, any> = {
    $unset: { likes: "" },
  };

  if (typeof item.likesCount === "number") {
    await FeedPostModel.findByIdAndUpdate(item._id, update, { strict: false });
    return Number(item.likesCount);
  }

  const likeCount = await LikeModel.countDocuments({ post: item._id });

  update.$set = {
    likesCount: likeCount,
  };

  await FeedPostModel.findByIdAndUpdate(item._id, update, { strict: false });
  return likeCount;
}

async function adjustPostLikeCount(postObjectId: unknown, delta: number) {
  const updatedPost = await FeedPostModel.findByIdAndUpdate(
    postObjectId,
    { $inc: { likesCount: delta }, $unset: { likes: "" } },
    { new: true, strict: false },
  ).select("likesCount");

  return updatedPost ? getPostLikeCount(updatedPost) : 0;
}

router.get("/", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const visibleUserIds = await findVisibleUserIds(user);
    const posts = await FeedPostModel.find({ user: { $in: visibleUserIds } })
      .populate("user")
      .populate("activity")
      .populate("group")
      .sort({ createdAt: -1, _id: -1 });
    const postIds = posts.map((post: Record<string, any>) => asObject(post)._id);
    const commentCounts = await CommentModel.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);
    const commentCountsByPostId = new Map<string, number>(
      commentCounts.map((item: Record<string, any>) => [
        String(item._id),
        item.count ?? 0,
      ]),
    );
    const currentUserLikes = await LikeModel.find({
      post: { $in: postIds },
      user: user._id,
    }).select("post");
    const likedPostIds = new Set(
      currentUserLikes.map((like: Record<string, any>) =>
        String(asObject(like).post?._id ?? asObject(like).post),
      ),
    );
    const serializedPosts = posts.map((post: Record<string, any>) => {
      const item = asObject(post);
      const storedCommentCount = Number(item.comments ?? 0);
      const commentCount =
        commentCountsByPostId.get(String(item._id)) ?? storedCommentCount;
      const likeCount = getPostLikeCount(post);

      return serializeFeedPost(post, {
        commentCount,
        likeCount,
        likedByCurrentUser: likedPostIds.has(String(item._id)),
      });
    });

    res.json(serializedPosts);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const caption = getString(req.body?.caption);
    const imageUrl = getString(req.body?.image);
    const categories = getCategories(req.body?.categories);
    const durationMinutes = Number(req.body?.durationMinutes);
    const groupId =
      req.body?.groupId === undefined || req.body?.groupId === null
        ? null
        : Number(req.body.groupId);

    if (!caption) {
      res.status(400).json({ message: "Post caption cannot be empty." });
      return;
    }

    if (caption.length > maxCaptionLength) {
      res.status(400).json({ message: "Post caption is too long." });
      return;
    }

    if (categories.length === 0) {
      res.status(400).json({ message: "Choose at least one category." });
      return;
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      durationMinutes > maxDurationMinutes
    ) {
      res.status(400).json({ message: "Choose a valid activity duration." });
      return;
    }

    if (imageUrl && imageUrl.length > maxImageUrlLength) {
      res.status(400).json({ message: "Image URL is too long." });
      return;
    }

    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      res.status(400).json({ message: "Image must be a valid URL." });
      return;
    }

    if (groupId !== null && !Number.isInteger(groupId)) {
      res.status(400).json({ message: "Choose a valid group." });
      return;
    }

    const group =
      groupId === null
        ? null
        : await ChatModel.findOne({ mockId: groupId, members: user._id });

    if (groupId !== null && !group) {
      res.status(400).json({
        message: "You can only reference groups you have joined.",
      });
      return;
    }

    const post = await FeedPostModel.create({
      mockId: await nextMockId(),
      user: user._id,
      group: group?._id,
      caption,
      image: imageUrl || undefined,
      categories,
      durationMinutes,
      likesCount: 0,
      comments: 0,
    });
    const savedPost = await FeedPostModel.findById(post._id)
      .populate("user")
      .populate("activity")
      .populate("group");

    if (!savedPost) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(201).json(serializeFeedPost(savedPost));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const postId = Number(req.params.id);
    const caption = getString(req.body?.caption);

    if (!caption) {
      res.status(400).json({ message: "Post caption cannot be empty." });
      return;
    }

    if (caption.length > maxCaptionLength) {
      res.status(400).json({ message: "Post caption is too long." });
      return;
    }

    const post = await findOwnedFeedPost(postId, user);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    post.caption = caption;
    await post.save();

    const likedByCurrentUser = await LikeModel.exists({
      post: post._id,
      user: user._id,
    });

    res.json(
      serializeFeedPost(post, {
        likeCount: getPostLikeCount(post),
        likedByCurrentUser: Boolean(likedByCurrentUser),
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const postId = Number(req.params.id);
    const post = await findOwnedFeedPost(postId, user);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    await Promise.all([
      CommentModel.deleteMany({ post: post._id }),
      LikeModel.deleteMany({ post: post._id }),
      FeedPostModel.deleteOne({ _id: post._id }),
    ]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:id/likes", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const postId = Number(req.params.id);
    const post = await findVisibleFeedPost(postId, user);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    let likeCount = await ensurePostLikeCount(post);
    const result = await LikeModel.updateOne(
      { post: post._id, user: user._id },
      { $setOnInsert: { post: post._id, user: user._id } },
      { upsert: true },
    );
    const createdLike = Boolean(
      (result as Record<string, any>).upsertedCount ||
        (result as Record<string, any>).upsertedId,
    );

    if (createdLike) {
      likeCount = await adjustPostLikeCount(post._id, 1);
    }

    res.status(201).json({
      postId: post.mockId,
      likesCount: likeCount,
      likedByMe: true,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/likes", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const postId = Number(req.params.id);
    const post = await findVisibleFeedPost(postId, user);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    let likeCount = await ensurePostLikeCount(post);
    const result = await LikeModel.deleteOne({ post: post._id, user: user._id });

    if (result.deletedCount > 0) {
      likeCount = await adjustPostLikeCount(post._id, -1);
    }

    res.json({
      postId: post.mockId,
      likesCount: likeCount,
      likedByMe: false,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/comments", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const postId = Number(req.params.id);
    const post = await findVisibleFeedPost(postId, user);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const comments = await CommentModel.find({ post: post._id })
      .populate("post")
      .populate("user")
      .sort({ createdAt: 1, _id: 1 })
      .limit(100);
    const commentCount = await CommentModel.countDocuments({ post: post._id });

    res.json({
      comments: comments.map(serializeComment),
      commentCount,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/comments", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

    const postId = Number(req.params.id);
    const post = await findVisibleFeedPost(postId, user);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const body = getString(req.body?.body ?? req.body?.comment);

    if (!body) {
      res.status(400).json({ message: "Comment cannot be empty." });
      return;
    }

    if (body.length > maxCommentLength) {
      res.status(400).json({ message: "Comment is too long." });
      return;
    }

    const comment = await CommentModel.create({
      post: post._id,
      user: user._id,
      body,
    });
    const savedComment = await CommentModel.findById(comment._id)
      .populate("post")
      .populate("user");

    if (!savedComment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    const commentCount = await CommentModel.countDocuments({ post: post._id });

    await FeedPostModel.findByIdAndUpdate(post._id, {
      comments: commentCount,
    });

    res.status(201).json({
      comment: serializeComment(savedComment),
      commentCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
