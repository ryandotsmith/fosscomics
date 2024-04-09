const fm = require("front-matter");
const fs = require("fs");

const common = require("./mod/common");
const config = require("./mod/config");
const marked = require("./mod/marked");

const renderArticle = (postPath) => {
  const postFile = fs.readFileSync(
    `${config.dev.postsdir}/${postPath}/index.md`,
    "utf8",
  );
  const content = fm(postFile);
  const post = new Post(postPath, content);
  return post;
};

class Post {
  constructor(path, content) {
    this.path = path;
    this.title = content.attributes.title;
    this.date = content.attributes.date;
    this.image = content.attributes.image;

    const tagArray = content.attributes.tags.split(",");
    this.tags = tagArray
      .map((tag) => tag.trim())
      .sort((a, b) => a.localeCompare(b));
    this.description = content.attributes.description;

    this.body = marked.parse(content.body);
    // remove <p></p> and <p> </p> from the beginning and end of the content.body
    this.body = this.body.replace(/<p><\/p>/g, "").replace(/<p> <\/p>/g, "");

    this.next = null;
    this.previous = null;
  }
}

// Read all markdown articles from content/posts and sort them by date
function renderArticles() {
  const posts = [];
  const postPaths = fs.readdirSync(config.dev.postsdir);
  postPaths.forEach((postPath) => {
    const post = renderArticle(postPath);
    posts.push(post);
  });
  // sort by date
  posts.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  // loop through posts and add previous and next post to each post
  for (let i = 0; i < posts.length; i++) {
    if (i > 0) {
      posts[i].next = posts[i - 1];
    }
    if (i < posts.length - 1) {
      posts[i].previous = posts[i + 1];
    }
  }

  return posts;
}

function createPostPages() {
  const posts = renderArticles();

  posts.forEach((post) => {
    if (fs.existsSync(`${config.dev.outdir}/${post.path}`))
      fs.rmdirSync(`${config.dev.outdir}/${post.path}`, { recursive: true });

    fs.mkdirSync(`${config.dev.outdir}/${post.path}`);

    const data = { post: post };
    fs.writeFile(
      `${config.dev.outdir}/${post.path}/index.html`,
      common.generateHTML("./themes/archie/layouts/post.html", data),
      (e) => {
        if (e) throw e;
        console.log(`${post.path}/index.html was created successfully`);
      },
    );

    // Copy images folder from ${config.dev.postsdir}/${postPath} to ${config.dev.outdir}/${postPath}
    if (!fs.existsSync(`${config.dev.outdir}/${post.path}/images`))
      fs.mkdirSync(`${config.dev.outdir}/${post.path}/images`);

    fs.readdirSync(`${config.dev.postsdir}/${post.path}/images`).forEach(
      (image) => {
        fs.copyFileSync(
          `${config.dev.postsdir}/${post.path}/images/${image}`,
          `${config.dev.outdir}/${post.path}/images/${image}`,
        );
      },
    );
  });

  return posts;
}

module.exports = {
  createPostPages: createPostPages,
};
