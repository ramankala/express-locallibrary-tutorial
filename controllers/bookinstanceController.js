var BookInstance = require("../models/bookinstance");
const { body, validationResult } = require("express-validator");
var Book = require("../models/book");

const async = require("async");

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate("book")
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function (err, bookInstance) {
      if (err) {
        return next(err);
      }
      if (bookInstance == null) {
        // No results
        var err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance_detail", {
        title: "Copy: " + bookInstance.book.title,
        bookinstance: bookInstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, "title").exec(function (err, books) {
    if (err) {
      return next(err);
    }
    // Successful, so render
    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error message
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        // Successful, so render
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book_id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      // Data from form is valid
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {
  async.parallel(
    {
      bookInstance: function (callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
    },
    function (err, results) {
      if (err) return next(err);
      res.render("bookinstance_delete", {
        title: "Delete Book Instance",
        bookinstance: results.bookInstance,
      });
    }
  );
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res, next) {
  async.parallel(
    {
      bookInstance: function (callback) {
        BookInstance.findById(req.body.bookinstanceid).exec(callback);
      },
    },
    function (err, results) {
      if (err) return next(err);
      BookInstance.findByIdAndRemove(
        req.body.bookinstanceid,
        function deleteBookInstance(err) {
          if (err) return next(err);
          res.redirect("/catalog/bookinstances");
        }
      );
    }
  );
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = (req, res, next) => {
  // Get book, authors, and genres for form.
  async.parallel(
    {
      book_instance: function (callback) {
        BookInstance.findById(req.params.id)
          .populate("book")
          .exec(callback);
      },
      book: function (callback) {
        Book.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book_instance == null) {
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      res.render("bookinstance_form", {
        title: "Update BookInstance",
        book_list: results.book,
        selected_book: results.book_instance.book._id,
        bookinstance: results.book_instance,
      });
    }
  );
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  
    // Process request after validation and sanitization
    (req, res, next) => {
      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a BookInstance object with escape/trimmed data and current id.
      var bookinstance = new BookInstance({
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
        _id: req.params.id,
      });

      if (!errors.isEmpty()) {
        // There are errors so render the form again, passing sanitized values and erros
        Book.find({}, "title").exec(function (err, books) {
          if (err) {
            return next(err);
          }
          // Successful, so render.
          res.render("bookinstance_form", {
            title: "Update BookInstance",
            book_list: books,
            selected_book: bookinstance.book._id,
            errors: errors.array(),
            bookinstance: bookinstance,
          });
        });
        return;
      } else {
        // Data from form is valid.
        BookInstance.findByIdAndUpdate(
          req.params.id,
          bookinstance,
          {},
          function(err, thebookinstance) {
            if (err) {
              return next(err);
            }
            // Successful - redirect to detail page.
            res.redirect(thebookinstance.url);
          }
        );
      }
    },
];