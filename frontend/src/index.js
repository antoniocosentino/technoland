import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
const SpotifyWebApi = require('spotify-web-api-node');
const request = require('request');

const spotifyApi = new SpotifyWebApi({
    clientId : process.env.REACT_APP_SPOTIFY_CLIENT_ID,
    clientSecret : process.env.REACT_APP_SPOTIFY_CLIENT_SECRET
});

class AppTitle extends React.Component {
    render() {
        return (
          <h1>Is Antonio in the land of Techno?</h1>
        );
    }
}

class Loading extends React.Component {
    loadingImage = require(`./img/loading.gif`);
    render() {
        return (
          <img className="loadingImg" src={ this.loadingImage } alt="Loading" />
        );
    }
}

class YesNo extends React.Component {
    render() {
        return (
          <span className="yesNo">{ this.props.answer }</span>
        );
    }
}

class Eq extends React.Component {
    playingIcon = require(`./img/eq.gif`);
    render() {
        return (
          <img className="playingIcon" src={ this.playingIcon } alt="Eq" />
        );
    }
}

class AlbumCover extends React.Component {
    render() {
        return (
          <img alt="Album Cover" src={ this.props.albumImg } />
        );
    }
}

class GenreTag extends React.Component {
    render() {
        return (
          <span className="tag" key={ this.props.tag }>{ this.props.tag }</span>
        );
    }
}

class SongInfo extends React.Component {
    render() {
        return (
            <div className="songInfo">
                <span className="songArtist">{ this.props.artist }</span>
                 &nbsp;-&nbsp;
                <span className="songTitle">{ this.props.title }</span>
            </div>
        );
    }
}

class NotListening extends React.Component {
    render() {
        return (
            <span>Antonio is not listening to music right now. Come back soon! :)</span>
        );
    }
}

class ViewGitHub extends React.Component {
    render() {
        return (
            <a className="viewGit" href="https://github.com/antoniocosentino/technoland">View on Github</a>
        );
    }
}

class Techno extends React.Component {

    constructor(){
        super();
        this.state = {
            albumImg    : null,
            loading     : true,
            artist      : null,
            title       : null,
            yesNo       : '',
            isPlaying   : false,
            tags        : []
        };

        this.accessToken = '';
        this.fetchInfo = this.fetchInfo.bind(this);
    };

    getToken(){
        return new Promise((resolve, reject) => {
            request(process.env.REACT_APP_API_URL, (error, response, body) => {
                if (error) {
                    this.setState( {
                        isPlaying : false,
                        yesNo     : 'NO',
                        loading   : false
                    } );
                }
                else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }

    getPlayingInfo() {
        return new Promise((resolve, reject) => {
            spotifyApi.setAccessToken(this.accessToken);
            spotifyApi.getMyCurrentPlayingTrack()
            .then(data => {
                resolve(data);
            },
            (err) => {
                this.setState( {
                    isPlaying : false,
                    yesNo     : 'NO',
                    loading   : false
                } );
            });
        });
    }

    getArtistInfo(artist) {
        return new Promise((resolve, reject) => {
            spotifyApi.setAccessToken(this.accessToken);
            spotifyApi.searchArtists(artist)
            .then((artistData) => {
                resolve(artistData);
            },
            (err) => {
                this.setState( {
                    isPlaying : false,
                    yesNo     : 'NO',
                    loading   : false
                } );
            });
        });
    }

    fetchInfo() {
        this.getPlayingInfo().then((playingInfo) => {
            this.getArtistInfo(playingInfo.body.item.artists[0].name).then((artistData) => {

                const needle = [ 'techno', 'electro house', 'destroy techno', 'german techno', 'minimal techno'];
                const genreFilter =  needle.some(function (v) {
                    return artistData.body.artists.items[0].genres.indexOf(v) >= 0;
                });

                var yesNo = '';

                if (playingInfo.body.is_playing && genreFilter){
                    yesNo = 'YES';
                }
                else {
                    yesNo = 'NO';
                }

                if (playingInfo.body.is_playing) {
                    document.title = `${playingInfo.body.item.artists[0].name} - ${playingInfo.body.item.name}`;
                }
                else {
                    document.title = 'Is Antonio in the land of Techno?';
                }

                this.setState( {
                    albumImg  : playingInfo.body.item.album.images[0].url,
                    artist    : playingInfo.body.item.artists[0].name,
                    title     : playingInfo.body.item.name,
                    loading   : false,
                    isPlaying : playingInfo.body.is_playing,
                    yesNo     : yesNo,
                    tags      : artistData.body.artists.items[0].genres
                } );

            });
        });
        setTimeout(this.fetchInfo, 10000);
    }

    componentDidMount() {
        this.getToken().then((responseObj) => {
            this.accessToken = responseObj.access_token;
            this.fetchInfo();
        });
    }

    render() {
        return (
            <div>
                <div className="technoContainer">
                <AppTitle />
                { this.state.loading &&
                    <Loading />
                }
                { !this.state.loading &&
                    <div className="albumWrapper">
                        <YesNo answer={ this.state.yesNo } />
                        { this.state.isPlaying &&
                            <div>
                                <AlbumCover albumImg={ this.state.albumImg } />
                                <Eq />
                                <SongInfo artist={ this.state.artist } title={ this.state.title } />
                                {this.state.tags.map(tag => (
                                    <GenreTag key={ tag } tag={ tag } />
                                ))}
                            </div>
                        }
                        { !this.state.isPlaying &&
                            <NotListening />
                        }
                    </div>
                }
                </div>
                <ViewGitHub />
            </div>
        );
    }
}



ReactDOM.render(
    <Techno />,
    document.getElementById('root')
);





