/**
 * Port of the leaderboard example to use React for rendering.
 *
 * This directive is necessary to enable preprocessing of JSX tags:
 * @jsx React.DOM
 */

// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Meteor.Collection("players");

var Leaderboard = React.createClass({
  mixins: [ReactMeteor.Mixin],

  getMeteorState: function() {
    var selectedPlayer = Players.findOne(Session.get("selected_player"));
    return {
      players: Players.find({}, {sort: {score: -1, name: 1}}).fetch(),
      selectedPlayer: selectedPlayer,
      selectedName: selectedPlayer && selectedPlayer.name
    };
  },

  addFivePoints: function() {
    Players.update(Session.get("selected_player"), {$inc: {score: 5}});
  },

  renderPlayer: function(model) {
    return <Player id={model._id} name={model.name} score={model.score} player_id={model.player_id} />;
  },

  render: function() {
    var children = [
      <div className="leaderboard" id="leaderboard">
        { this.state.players.map(this.renderPlayer) }
      </div>
    ];

    if (this.state.selectedName) {
      children.push(
        <div className="details">
          <div className="name">{this.state.selectedName}</div>
          <input
            type="button"
            className="inc"
            value="Give 5 points"
            onClick={this.addFivePoints}
          />
        </div>
      );

    } else {
      children.push(
        <div className="none">Click a player to select</div>
      );
    }

    return <div>{ children }</div>;
  }
});

var Player = React.createClass({
  mixins: [ReactMeteor.Mixin],

  getMeteorState: function() {
    return {
      isSelected: Session.equals("selected_player", this.props.id)
    };
  },

  select: function() {
    Session.set("selected_player", this.props.id);
  },

  render: function() {
    var className = "player";
    if (this.state.isSelected) {
      className += " selected";
    }

    return (
      <div className={className} onClick={this.select}>
        <a href={"player/" + this.props.player_id} className="name">{this.props.name}</a>
        <span className="score">{this.props.score}</span>
      </div>
    );
  }
});

var PlayerViewRootComponent = React.createClass({
  mixins: [ReactMeteor.Mixin],

  getMeteorState: function() {
    return Players.findOne({player_id: this.props.player_id});
  },

  addFivePoints: function() {
    Players.update({_id: this.state._id}, {$inc: {score: 5}});
  },
  
  render: function(){
    return (
      <div>
        <h1>{this.state.name} has {this.state.score} points.</h1>
        <input
          type="button"
          className="inc"
          value="Give 5 points"
          onClick={this.addFivePoints}
        />
      </div>
    );
  }
});

if (Meteor.isClient) {
  Meteor.Router.add({
    '/': function() {
      React.renderComponent(
       <Leaderboard />,
       document.body
      );
    },
    '/player/:player_id': function(id) {
      React.renderComponent(
       <PlayerViewRootComponent player_id={id} />,
       document.body
      );
    },
    '*': 'not_found'
  });
  Meteor.startup(function() {
//    page("/", function(){
//      React.renderComponent(
//        <Leaderboard />,
//        document.body
//      );
//    });
//    page("/player/:player_id", function(ctx){
//      React.renderComponent(
//        <PlayerViewRootComponent player_id={ctx.params.player_id} />,
//        document.body
//      );
//    });
//    page();
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {

  Meteor.startup(function () {

    var head = "";
    var manifest = WebApp.clientProgram.manifest;
    for (var i=0; i<manifest.length; i++){
      if(manifest[i].where === "client"){
        if(manifest[i].type === "js"){
          head = head + "<script type='text/javascript' src='" + manifest[i].url + "'></script>\n";
        } else if (manifest[i].type === "css"){
          head = "<link rel='stylesheet' href='" + manifest[i].url + "'/>\n" + head;
        }
      }
    }

    Players.remove({});
    if (Players.find().count() === 0) {
      var names = ["Ada Lovelace",
                   "Grace Hopper",
                   "Marie Curie",
                   "Carl Friedrich Gauss",
                   "Nikola Tesla",
                   "Claude Shannon"];
      for (var i = 0; i < names.length; i++)
        Players.insert({player_id: names[i].toLowerCase().replace(/ /g, "-"), name: names[i], score: Math.floor(Random.fraction()*10)*5});
    }
    Session = ServerSession;

    React.renderComponentToString(<Leaderboard />, function(html){
      Meteor.Router.add('/', function() {
        return "<head><title>" + "Leaderboard" + "</title>" + head + "</head><body>" + html + "</body>";
      });
    });
    Players.find().map(function(player){
      React.renderComponentToString(<PlayerViewRootComponent player_id={player.player_id} />, function(html){
        Meteor.Router.add("/player/" + player.player_id, function() {
          return "<head><title>" + player.name + "</title>" + head + "</head><body>" + html + "</body>";
        });
      });
    });
  });
}
