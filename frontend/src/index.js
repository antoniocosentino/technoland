import React from 'react';
import ReactDOM from 'react-dom';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';
import { fetchPlayback } from './playback';
import { readSession, readLoginError, connect, disconnect, playbackUrl } from './session';

class AppTitle extends React.Component {
    render() {
        return (
          <h1>{this.props.userName === 'You' ? 'Are you' : `Is ${this.props.userName}`} in the land of Techno?</h1>
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
          <span className={this.props.answer === 'UNKNOWN' ? 'yesNo unknown' : 'yesNo'}>{ this.props.answer }</span>
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

        const { bigMode } = this.props;

        if ( bigMode ) {
            return (
                <div className="songInfo bigText">
                    <span className="songArtist">{ this.props.artist }</span>
                     <br />
                    <span className="songTitle">{ this.props.title }</span>
                </div>
            );    
        }

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
            <span>{this.props.userName === 'You' ? 'You are' : `${this.props.userName} is`} not listening to music right now.</span>
        );
    }
}

class ViewGitHub extends React.Component {
    render() {
        return (
            <a className="viewGit" href="https://github.com/antoniocosentino/technoland"><i className="fa fa-github"></i> View on Github</a>
        );
    }
}

class Separator extends React.Component {
    render() {
        return (
            <div className="separator"></div>
        );
    }
}

export class Techno extends React.Component {

    constructor(){
        super();
        this.state = {
            albumImg    : null,
            loading     : true,
            artist      : null,
            title       : null,
            yesNo       : '',
            isPlaying   : false,
            tags        : [],
            connError   : false
        };

        this.fetchInfo = this.fetchInfo.bind(this);
        this.session = readSession();
        this.state.loginError = readLoginError();
        this.userName = this.session ? 'You' : 'Antonio';
        this.minimalMode = false;
        this.active = false;
    };

    parseQueryString() {
        var str = window.location.search;
        var objURL = {};

        str.replace(
            new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
            function( $0, $1, $2, $3 ){
                objURL[ $1 ] = $3;
            }
        );
        return objURL;
    };

    async fetchInfo() {
        this.controller = new AbortController();
        const timeout = setTimeout(() => this.controller.abort(), 60000);
        try {
            const track = await fetchPlayback(playbackUrl(this.session), this.controller.signal, this.session);
            if (!this.active) return;
            this.setState({
                albumImg: track ? track.albumImg : null,
                artist: track ? track.artist : null,
                title: track ? track.title : null,
                tags: track && track.genres ? track.genres : [],
                yesNo: track ? track.answer : 'NO',
                isPlaying: !!track,
                loading: false,
                connError: false
            });
            document.title = track ? `${track.artist} - ${track.title}` : 'In the land of Techno';
        } catch (error) {
            if (this.active) {
                this.setState({ loading: false, isPlaying: false, connError: true });
                document.title = 'In the land of Techno';
            }
        } finally {
            clearTimeout(timeout);
            if (this.active) this.timer = setTimeout(this.fetchInfo, 10000);
        }
    }

    componentDidMount() {
        const urlParams = this.parseQueryString();
        this.minimalMode = !!urlParams.minimal;
        if (urlParams.rotate && Number.isFinite(Number(urlParams.rotate))) {
            this.previousTransform = document.body.style.transform;
            this.previousHeight = document.body.style.height;
            document.body.style.transform = `rotate(${Number(urlParams.rotate)}deg)`;
            document.body.style.height = '90vh';
        }
        this.active = true;
        this.fetchInfo();
    }

    componentWillUnmount() {
        this.active = false;
        clearTimeout(this.timer);
        if (this.controller) this.controller.abort();
        if (this.previousTransform !== undefined) {
            document.body.style.transform = this.previousTransform;
            document.body.style.height = this.previousHeight;
        }
    }

    render() {

        if ( this.minimalMode ) {
            if ( this.state.isPlaying ) {
                return (
                    <div className="technoContainer">
                        <div>
                            {this.state.albumImg && <AlbumCover albumImg={ this.state.albumImg } />}
                            <br /><br />
                            <SongInfo bigMode={ true } artist={ this.state.artist } title={ this.state.title } />
                        </div>
                    </div>
                )
            }

            return (
                <div className="technoContainer">
                    {this.state.loading ? <Loading /> : this.state.connError ?
                        <span role="status">Playback is temporarily unavailable.</span> :
                        <NotListening userName={this.userName} />}
                </div>
            )
        }


        return (
            <div>
                <div className="technoContainer">
                { !this.state.connError &&
                    <AppTitle userName={ this.userName } />
                }
                { this.state.loading &&
                    <Loading />
                }
                { !this.state.loading && !this.state.connError &&
                    <div className="albumWrapper">
                        <YesNo answer={ this.state.yesNo } />
                        {this.state.isPlaying && this.state.yesNo === 'UNKNOWN' && <p>Genre information is unavailable.</p>}
                        { this.state.isPlaying &&
                            <div>
                                {this.state.albumImg && <AlbumCover albumImg={ this.state.albumImg } />}
                                <Eq />
                                <SongInfo artist={ this.state.artist } title={ this.state.title } />
                                {this.state.tags.map(tag => (
                                    <GenreTag key={ tag } tag={ tag } />
                                ))}
                            </div>
                        }
                        { !this.state.isPlaying &&
                            <NotListening userName={this.userName} />
                        }
                    </div>
                }
                { this.state.connError &&
                    <p role="status">Playback is temporarily unavailable. Retrying automatically.</p>
                }
                {this.state.loginError && <p role="status">{this.state.loginError}</p>}
                { process.env.REACT_APP_PUBLIC_API_URL &&
                    <div className="areYou">
                        <Separator />
                        { this.session ?
                            <button className="spotifyConnect" onClick={() => disconnect(this.session)}>Disconnect Spotify</button> :
                            <button className="spotifyConnect" onClick={connect}>Connect with Spotify</button>
                        }
                        {this.session && this.state.connError &&
                            <button className="spotifyConnect" onClick={connect}>Reconnect Spotify</button>}
                    </div>
                }
                <Separator />
                <ViewGitHub />
                </div>
            </div>
        );
    }
}



ReactDOM.render(
    <Techno />,
    document.getElementById('root')
);





