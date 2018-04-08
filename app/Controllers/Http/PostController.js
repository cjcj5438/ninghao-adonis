'use strict'

const Database = use('Database')
const Post = use('App/Models/Post')
const User = use('App/Models/User')
const Tag = use('App/Models/Tag')
const { validateAll } = use('Validator')

class PostController {
  async index ({ view }) {
    const posts = await Post
      .query()
      .with('user', (builder) => {
        builder.select('id', 'username')
      })
      .with('user.profile')
      .fetch()

    console.log(posts.toJSON())
    // console.log(posts)
    // return posts
    return view.render('post.index', { posts: posts.toJSON() })
  }

  async create ({ view }) {
    const users = await User.all()
    const tags = await Tag.all()
    return view.render('post.create', { users: users.toJSON(), tags: tags.toJSON() })
  }

  async store ({ request, response, session }) {
    const rules = {
      title: 'required',
      content: 'required'
    }

    const validation = await validateAll(request.all(), rules)

    if (validation.fails()) {
      session
        .withErrors(validation.messages())
        .flashAll()

      return response.redirect('back')
    }

    const newPost = request.only(['title', 'content'])
    const tags = request.input('tags')
    // const postID = await Database.insert(newPost).into('posts')
    // console.log('postID: ', postID)
    // const post = await Post.create(newPost)

    const user = await User.find(request.input('user_id'))
    const post = await user
      .posts()
      .create(newPost)

    await post
      .tags()
      .attach(tags)

    return response.redirect(`/posts/${ post.id }`)
  }

  async show ({ view, params }) {
    // const post = await Database
    //   .from('posts')
    //   .where('id', params.id)
    //   .first()

    const post = await Post.findOrFail(params.id)

    const tags = await post
      .tags()
      .select('id', 'title')
      .fetch()

    return view.render('post.show', { post, tags: tags.toJSON() })
  }

  async edit ({ view, params }) {
    // const post = await Database
    //   .from('posts')
    //   .where('id', params.id)
    //   .first()

    const _post = await Post.findOrFail(params.id)

    const _users = await User.all()
    const users = _users.toJSON()
    const _tags = await Tag.all()
    const tags = _tags.toJSON()
    await _post.load('tags')
    const post = _post.toJSON()
    const postTagIds = post.tags.map(tag => tag.id)

    const tagItems = tags.map((tag) => {
      if (postTagIds.includes(tag.id)) {
        tag.checked = true
      }

      return tag
    })

    const userItems = users.map((user) => {
      if (user.id === post.user_id) {
        user.checked = true
      }

      return user
    })

    return view.render('post.edit', {
      post,
      users: userItems,
      tags: tagItems
    })
  }

  async update ({ request, params }) {
    const { title, content, user_id, tags } = request.all()
    // await Database
    //   .table('posts')
    //   .where('id', params.id)
    //   .update(updatedPost)

    const post = await Post.findOrFail(params.id)
    post.merge({ title, content })
    await post.save()

    const user = await User.find(user_id)
    await post.user().associate(user)

    await post.tags().sync(tags)
  }

  async destroy ({ request, params }) {
    // await Database
    //   .table('posts')
    //   .where('id', params.id)
    //   .delete()

    const post = await Post.find(params.id)

    try {
      await post.tags().detach()
      await post.delete()
    } catch (error) {
      console.log(error)
    }

    return 'success'
  }
}

module.exports = PostController
