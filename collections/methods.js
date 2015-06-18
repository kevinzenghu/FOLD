var publishAccessLevel = parseInt(Meteor.settings['public'].PUBLISH_ACCESS_LEVEL || 0);
var createAccessLevel = parseInt(Meteor.settings['public'].CREATE_ACCESS_LEVEL || 0);

if (Meteor.isClient) {
  window.publishAccessLevel = publishAccessLevel;
  window.createAccessLevel = createAccessLevel;
}

var changeFavorite;

changeFavorite = function(storyId, toFavorite) {
  var operator, storyOperation, userOperation;

  this.unblock();
  if (!this.userId) {
    throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to favorite a story');
  }

  var story = Stories.findOne({
    _id: storyId,
  }, {
    fields: {
      favorited: 1
    }
  });

  operator = toFavorite ? '$addToSet' : '$pull';
  storyOperation = {};
  storyOperation[operator] = {
    favorited: this.userId
  };

  var currentlyFavorited = (_.contains(story.favorited, this.userId));

  if (toFavorite && !currentlyFavorited){
    storyOperation['$inc'] = { favoritedTotal : 1 };
  } else if (!toFavorite && currentlyFavorited){
    storyOperation['$inc'] = { favoritedTotal : -1 };
  }

  userOperation = {};
  userOperation[operator] = {
    'profile.favorites': storyId
  };
  Stories.update({
    _id: storyId
  }, storyOperation);
  return Meteor.users.update({
    _id: this.userId
  }, userOperation);
};

var changeEditorsPick = function(storyId, isPick) {

  this.unblock();
  if (!Meteor.user().admin) {
    throw new Meteor.Error('not-admin-in', 'Sorry, you must be an admin to designate an editors pick');
  }

  Stories.update({
    _id: storyId
  }, {
    $set: {
      editorsPick: isPick,
      editorsPickAt: new Date
    }
  });
};

var changeHasTitle = function(storyId, index, newValue){

  var selector = {_id: storyId};
  setObject = {};
  key = 'draftStory.verticalSections.' + index + '.hasTitle'
  setObject[key] = newValue;

  return updateStory.call(this, {_id: storyId }, {
    $set: setObject
  })
}


var checkOwner = function(userId, doc) {
  return userId && userId === doc.authorId;
};

var assertOwner = function(userId, doc) {
  if(!checkOwner(userId, doc)){
    throw new Meteor.Error('Only the author may edit in this way')
  }
};

var swapArrayElements = function(arr, x, y){
  var b = arr[y];
  arr[y] = arr[x];
  arr[x] = b;
};

// only the curator may update the stream
var updateStream = function(selector, modifier, options) {
  if (_.isEmpty(modifier)){
    return
  }
  modifier.$set = _.extend(modifier.$set || {}, {savedAt: new Date});
  selector.curatorId = this.userId; // this.userId must be the user (use via .call or .apply)

  return Deepstreams.update(selector, modifier, _.defaults({}, options, {removeEmptyStrings: false}));
};

// only the author may update the story
var updateContextBlocks = function(selector, modifier, options) {
  if (_.isEmpty(modifier)){
    return
  }
  modifier.$set = _.extend(modifier.$set || {}, {savedAt: new Date});
  selector.authorId = this.userId; // this.userId must be the user (use via .call or .apply)

  return ContextBlocks.update(selector, modifier, _.defaults({}, options, {removeEmptyStrings: false}));
};

Meteor.methods({
  addContextToStream: function(streamShortId, contextBlock){
    check(streamShortId, String);
    check(contextBlock, Object);

    //if (!Stories.find({_id: storyId, authorId: this.userId},{ fields:{ _id: 1 }}).count()){
    //  throw new Meteor.Error("User doesn't own story")
    //}

    //delete contextBlock._id;

    // TO-DO Remix. When add remix, will need another method or modify this one
    //var contextId = ContextBlocks.insert(_.extend({}, contextBlock, {
    //  storyId: storyId,
    //  storyShortId: storyShortId,
    //  authorId: Meteor.user()._id,
    //  savedAt: new Date
    //}));

    var pushObject, pushSelectorString;
    pushSelectorString = 'contextBlocks';
    pushObject = {};
    pushObject[pushSelectorString] = _.extend({}, contextBlock, {
      //storyId: storyId,
      //storyShortId: storyShortId,
      authorId: Meteor.user()._id,
      addedAt: new Date,
      savedAt: new Date
    });

    var numUpdated = updateStream.call(this, { shortId: streamShortId }, { $addToSet: pushObject}); // TODO, make it so can't easily add the same one twice (savedAt and addedAt are different)

    if (numUpdated){

      // TODO something
      if (Meteor.isClient){
        //window.hideNewHorizontalUI();

        //var story = Stories.findOne(storyId, fields);
        //goToX(_.indexOf(story.draftStory.verticalSections[verticalIndex].contextBlocks, contextId.toString()))
      }
    } else {
      throw new Meteor.Error('Stream not updated')
    }
    return contextBlock._id;
  },
  setActiveStream: function(streamShortId, streamId){
    check(streamShortId, String);
    check(streamId, String);
    return updateStream.call(this,{shortId: streamShortId}, {$set: {activeStreamId: streamId}});
  },
  addStreamToStream: function(streamShortId, stream){
    check(streamShortId, String);
    check(stream, Object);

    //if (!Stories.find({_id: storyId, authorId: this.userId},{ fields:{ _id: 1 }}).count()){
    //  throw new Meteor.Error("User doesn't own story")
    //}

    //delete contextBlock._id;

    // TO-DO Remix. When add remix, will need another method or modify this one
    //var contextId = ContextBlocks.insert(_.extend({}, contextBlock, {
    //  storyId: storyId,
    //  storyShortId: storyShortId,
    //  authorId: Meteor.user()._id,
    //  savedAt: new Date
    //}));

    var pushObject, pushSelectorString;
    pushSelectorString = 'streams';
    pushObject = {};
    pushObject[pushSelectorString] = _.extend({}, stream, {
      //storyId: storyId,
      //storyShortId: storyShortId,
      authorId: Meteor.user()._id,
      addedAt: new Date
    });

    var numUpdated = updateStream.call(this, { shortId: streamShortId }, { $addToSet: pushObject}); // TODO, make it so can't easily add the same one twice (addedAt is different)

    if (numUpdated){

      // TODO something
      if (Meteor.isClient){
        //window.hideNewHorizontalUI();

        //var story = Stories.findOne(storyId, fields);
        //goToX(_.indexOf(story.draftStory.verticalSections[verticalIndex].contextBlocks, contextId.toString()))
      }
    } else {
      throw new Meteor.Error('Stream not updated')
    }
    return stream._id;
  },


  removeContextFromStory: function(storyId, contextId, verticalSectionIndex) {
    check(storyId, String);
    check(contextId, String);
    check(verticalSectionIndex, Number);
    var pushSelectorString = 'draftStory.verticalSections.' + verticalSectionIndex + '.contextBlocks';
    var pullObject = {};
    pullObject[pushSelectorString] = contextId;
    var numUpdated = updateStory.call(this, {
      _id: storyId
    }, {
      $pull: pullObject
    });
    if (!numUpdated){
      throw new Meteor.Error('Story not updated')
    }
    // TO-DO Remix. Don't actually delete if has ever been remixed (or maybe if ever published)
    var numRemoved = ContextBlocks.remove({_id: contextId, authorId: this.userId});

    if (Meteor.isClient && numRemoved){
      Session.set("addingContext", null);
      Session.set("editingContext", null);
      var currentX = Session.get('currentX');
      goToX(currentX ? currentX - 1 : 0);
    }

    return numRemoved;
  },
  setStreamTitleDescription: function(shortId, title, description){
    check(shortId, String);
    check(title, String);
    check(description, String);
    // TODO DRY
    var storyPathSegment = _s.slugify(title.toLowerCase() || 'deep-stream')+ '-' + shortId;
    return updateStream.call(this, {shortId: shortId}, {$set: {'title' : title, 'description' : description, 'storyPathSegment' : storyPathSegment, creationStep: nextCreationStepAfter('title_description') }});
  },
  skipFindStreamStep: function(shortId){
    check(shortId, String);
    return updateStream.call(this, {shortId: shortId}, {$set: {creationStep: nextCreationStepAfter('find_stream') }});
  },
  skipAddCardsStep: function(shortId){
    check(shortId, String);
    return updateStream.call(this, {shortId: shortId}, {$set: {creationStep: nextCreationStepAfter('add_cards') }});
  },
  publishStream: function(shortId){
    check(shortId, String);
    // TODO add onAir at... OR change it all to published
    return updateStream.call(this, {shortId: shortId}, {$set: {creationStep: null, onAir: true }});
  },
  unpublishStream: function(shortId){
    check(shortId, String);
    // TODO maybe change it all to published
    return updateStream.call(this, {shortId: shortId}, {$set: {onAir: false }});
  },
  updateStoryTitle: function(storyId, title){
    check(storyId, String);
    check(title, String);
    // TODO DRY
    var storyPathSegment = _s.slugify(title.toLowerCase() || 'new-story')+ '-' + Stories.findOne({_id: storyId}).shortId;
    return updateStory.call(this, {_id: storyId}, {$set: {'draftStory.title' : title, 'draftStory.storyPathSegment' : storyPathSegment }});
  },
  updateVerticalSectionTitle: function(storyId, index, title){ // TO-DO switch to using id instead of index
    check(storyId, String);
    check(index, Number);
    check(title, String);
    var setObject = { $set:{} };
    setObject['$set']['draftStory.verticalSections.' + index + '.title'] = title;

    return updateStory.call(this, {_id: storyId}, setObject, {removeEmptyStrings: false})
  },
  updateVerticalSectionContent: function(storyId, index, content){ // TO-DO switch to using id instead of index
    check(storyId, String);
    check(index, Number);
    check(content, String);
    // html is cleaned client-side on both save and display
    var setObject = { $set:{} };
    setObject['$set']['draftStory.verticalSections.' + index + '.content'] = content;

    return updateStory.call(this, {_id: storyId}, setObject, {removeEmptyStrings: false, autoConvert: false}); // don't autoconvert because https://github.com/aldeed/meteor-simple-schema/issues/348
  },
  updateHeaderImage: function(storyId, filePublicId, fileFormat) {
    check(storyId, String);
    check(filePublicId, String);
    check(fileFormat, String);
    return updateStory.call(this, {_id: storyId}, {
      $set: {
        'draftStory.headerImage': filePublicId,
        'draftStory.headerImageFormat': fileFormat
      }
    })
  },
  addTitle: function(storyId, index) {
    check(storyId, String);
    check(index, Number);
    return changeHasTitle.call(this, storyId, index, true);
  },
  removeTitle: function(storyId, index) {
    check(storyId, String);
    check(index, Number);
    return changeHasTitle.call(this, storyId, index, false);
  },
  editHorizontalBlockDescription: function(horizontalId, description) {
    check(horizontalId, String);
    check(description, String);
    return updateContextBlocks.call(this, {"_id": horizontalId }, {"$set": {"description": description}});
  },
  editTextSection: function(horizontalId, content) {
    check(horizontalId, String);
    check(content, String);
    return updateContextBlocks.call(this, {"_id": horizontalId }, {"$set": {"content": content}});
  },
  reorderStory: function(storyId, idMap) {
    check(storyId, String);
    check(idMap, [Object]);

    var story = Stories.findOne({_id: storyId, authorId: this.userId}, {
      fields: {
        'draftStory.verticalSections': 1
      }
    });

    if (!story || !story.draftStory){
      return new Meteor.Error('story not found for reordering: ' + storyId)
    }

    var draftStory = story.draftStory;

    var originalVerticalSections = draftStory.verticalSections;


    var newVerticalSections = _.map(idMap, function(horizontal) {
      return _.extend(
        {},
        _.findWhere(originalVerticalSections, {_id: horizontal.verticalId}),
        {
          contextBlocks: horizontal.contextBlocks
        }
      );
    });

    return updateStory.call(this, {_id: storyId}, {
      $set: {
        'draftStory.verticalSections': newVerticalSections
      }
    })
  },
  insertVerticalSection: function(storyId, index, verticalSectionId) { // TO-DO find a good way to generate this id in a trusted way
    check(storyId, String);
    check(index, Number);
    var newSection = {
      _id: verticalSectionId,
      contextBlocks: [],
      title: "",
      content: "",
      hasTitle: false
    };

    var numUpdated = updateStory.call(this, {_id: storyId }, {
      $push: {
        'draftStory.verticalSections': {
          $position: index,
          $each: [newSection]
        }
      }
    });

    if (Meteor.isClient && numUpdated){
      goToY(index);
    }

    return numUpdated;
  },
  moveVerticalSectionUpOne: function(storyId, index) {
    check(storyId, String);
    check(index, Number);
    if (!index){
      throw new Meteor.Error('Must have a positive index')
    }

    var selector = { _id: storyId };
    var story = Stories.findOne(selector, {fields:
      {
        'draftStory.verticalSections': 1,
        'authorId': 1
      }
    });

    assertOwner(this.userId, story);

    var verticalSections = story.draftStory.verticalSections;

    swapArrayElements(verticalSections, index, index - 1);

    var numUpdated = updateStory.call(this, { _id: storyId }, {
      $set: {
        'draftStory.verticalSections': verticalSections
      }
    });

    if (Meteor.isClient && numUpdated) {
      goToY(index - 1);
    }

    return numUpdated
  },
  moveVerticalSectionDownOne: function(storyId, index) {
    check(storyId, String);
    check(index, Number);

    var selector = { _id: storyId };
    var story = Stories.findOne(selector, {fields:
      {
        'draftStory.verticalSections': 1,
        'authorId': 1
      }
    });

    assertOwner(this.userId, story);

    var verticalSections = story.draftStory.verticalSections;


    if ((index + 1) >= verticalSections.length){
      throw new Meteor.Error('Index too high')
    }

    swapArrayElements(verticalSections, index, index + 1);

    var numUpdated = updateStory.call(this, { _id: storyId }, {
      $set: {
        'draftStory.verticalSections': verticalSections
      }
    })

    if (Meteor.isClient && numUpdated) {
      goToY(index + 1);
    }

    return numUpdated
  },
  deleteVerticalSection: function(storyId, index) {
    check(storyId, String);
    check(index, Number);

    var selector = { _id: storyId };
    var story = Stories.findOne(selector, {fields:
      {
        'draftStory.verticalSections': 1,
        'authorId': 1
      }
    });

    assertOwner(this.userId, story);

    var verticalSections = story.draftStory.verticalSections;

    if (index < 0 || index >= story.draftStory.verticalSections){
      throw new Meteor.Error('Index too high')
    }

    var contextBlocks = verticalSections[index].contextBlocks;

    if (contextBlocks){ // TO-DO Remix. Check if remixed etc..
      ContextBlocks.remove({_id: {$in: contextBlocks}, authorId: this.userId})
    }

    return updateStory.call(this, { _id: storyId }, {
      $pull: {
        'draftStory.verticalSections': {_id: verticalSections[index]._id}
      }
    })
  },
  publishStory: function(storyId, title, keywords, narrativeRightsReserved) {
    check(storyId, String);
    check(title, String);
    check(keywords, [String]);
    check(narrativeRightsReserved, Boolean);
    if (!this.userId) {
      throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to publish a story');
    }

    var user = Meteor.user();

    if (!user){
      throw new Meteor.Error('user not found by author to publish. userId: ' + this.userId);
    }

    var accessPriority = user.accessPriority;
    if(!accessPriority || accessPriority > publishAccessLevel){
      throw new Meteor.Error('user does not have publish access. userId: ' + this.userId);
    }

    var story = Stories.findOne({_id: storyId, authorId: this.userId});

    if (!story){
      throw new Meteor.Error('story not found by author to publish. story: ' + storyId + '  userId: ' + this.userId);
    }


    var draftStory = story.draftStory;

    if (!draftStory){
      throw new Meteor.Error('story for publishing does not have a draft. story: ' + storyId + '  userId: ' + this.userId)
    }

    var contextBlockIds = _.chain(draftStory.verticalSections)
      .pluck('contextBlocks')
      .flatten()
      .value();

    // update contextblocks so they are ready for publish
    var numCBlocksUpdated = updateContextBlocks.call(this, { _id: {$in: contextBlockIds} }, {
      $set: {
        'published': true,
        'everPublished': true,
        'publishedAt': new Date()
      },
    }, {multi: true});

    if (numCBlocksUpdated !== contextBlockIds.length){
      throw new Meteor.Error('context blocks failed to update on publish ' + storyId + '. Maybe some are missing. Or are not by author. Number of ids: ' + contextBlockIds.length + ' Number of blocks updated: ' + numCBlocksUpdated);
    }

    var contextBlocks = ContextBlocks.find({_id: {$in: contextBlockIds}}).fetch();

    var contextBlockTypeCount = _.chain(contextBlocks).pluck('type').countBy(_.identity).value();

    // TO-DO
    // Maybe a list of which cards are original and which are remixed

    var fieldsToCopyFromDraft = [
      'verticalSections',
      'headerImage',
      'headerImageFormat',
      'headerImageAttribution'
      //'title'
    ];

    var fieldsToSetFromArguments = {
      'title': title,
      'draftStory.title': title,
      'keywords': keywords,
      'draftStory.keywords': keywords,
      'narrativeRightsReserved': narrativeRightsReserved,
      'draftStory.narrativeRightsReserved': narrativeRightsReserved,
    };


    var setObject = _.extend({},
      _.pick(draftStory, fieldsToCopyFromDraft), // copy all safe fields from draftStory.
      fieldsToSetFromArguments,
      {
        'contextBlocks': contextBlocks,
        'contextBlockIds': contextBlockIds,
        'contextBlockTypeCount': contextBlockTypeCount,
        'userPathSegment': user.displayUsername,
        'storyPathSegment': _s.slugify(title.toLowerCase()) + '-' + story.shortId, // TODO DRY
        'publishedAt': new Date,
        'firstPublishedAt': story.firstPublishedAt || new Date, // only change if not set TODO cleanup and actually don't set if already set
        'published': true,
        'everPublished': true,
        'authorName': user.profile.name || 'Anonymous',
        'authorUsername': user.username,
        'authorDisplayUsername': user.displayUsername,
        'version': 'earlybird'
      }
    );

    if (story.published){ // if was published before, add the current published version to the history
      StoryHistories.insert(_.extend({storyId: story._id}, _.omit(story, ['draftStory', 'history', '_id']))); // TO-DO remove history once migrate all existing stories
    }

    return updateStory.call(this, { _id: storyId }, {
      $set: setObject
    });
  },
  favoriteStory: function(storyId) {
    check(storyId, String);
    return changeFavorite.call(this, storyId, true);
  },
  unfavoriteStory: function(storyId) {
    check(storyId, String);
    return changeFavorite.call(this, storyId, false);
  },
  designateEditorsPick: function(storyId) {
    check(storyId, String);
    return changeEditorsPick.call(this, storyId, true);
  },
  stripEditorsPick: function(storyId) {
    check(storyId, String);
    return changeEditorsPick.call(this, storyId, false);
  },
  createDeepstream: function(shortId) { // TO-DO find a way to generate these in a trusted way server without compromising UI speed
    var user = Meteor.user();
    if (!user) {
      throw new Meteor.Error('not-logged-in', 'Sorry, you must be logged in to create a story');
    }
    var accessPriority = user.accessPriority;
    if(!accessPriority || accessPriority > createAccessLevel){
      throw new Meteor.Error('user does not have create access. userId: ' + this.userId);
    }

    var streamPathSegment = _s.slugify('new-deep-stream') + '-' + shortId;  // TODO DRY
    var userPathSegment= user.displayUsername;

    Deepstreams.insert({
      onAir: false,
      savedAt: new Date,
      userPathSegment: userPathSegment,
      streamPathSegment: streamPathSegment,
      curatorId: this.userId,
      curatorName: user.profile.name || user.username,
      curatorUsername: user.username,
      curatorDisplayUsername: user.displayUsername,
      shortId: shortId,
      creationStep: CREATION_STEPS[0]
    });

    if (Meteor.isClient){
      FlowRouter.go('curate', {userPathSegment: userPathSegment, streamPathSegment: streamPathSegment});
    }

    return {
      userPathSegment: userPathSegment,
      streamPathSegment: streamPathSegment
    };
  }

});


