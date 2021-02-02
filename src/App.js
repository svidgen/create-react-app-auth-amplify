import React, { Component, useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";
import { ApolloClient, ApolloLink, gql, HttpLink, InMemoryCache } from "@apollo/client";
import { withAuthenticator } from "aws-amplify-react";
import Amplify, { Auth } from "aws-amplify";
import { createAuthLink } from "aws-appsync-auth-link";
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import aws_exports from "./aws-exports";
// import { graphql } from "react-apollo";
import { listNotes as listNotesQuery } from "./graphql/queries";
import {
  createNote as createNoteQuery,
  deleteNote as deleteNoteQuery
} from "./graphql/mutations"
import { onCreateNote as onCreateNoteQuery } from "./graphql/subscriptions"

let _client, _subscription;

let config = Amplify.configure(aws_exports);
const listNotes = gql(listNotesQuery);
const createNote = gql(createNoteQuery);
const deleteNote = gql(deleteNoteQuery);
const onCreateNote = gql(onCreateNoteQuery)

async function get_client() {
  if (_client) {
    return _client;
  }

  let session = await Auth.currentSession();
  
  const aws_auth_config = {
    url: aws_exports.aws_appsync_graphqlEndpoint,
    region: aws_exports.aws_appsync_region,
    auth: {
      type: aws_exports.aws_appsync_authenticationType,
      jwtToken: session.accessToken.jwtToken
    }
  };
  const httpLink = new HttpLink({uri: aws_auth_config.url});
  
  const link = ApolloLink.from([
    createAuthLink(aws_auth_config),
    createSubscriptionHandshakeLink(aws_auth_config, httpLink)
  ]);
  
  _client = new ApolloClient({
    link,
    cache: new InMemoryCache()
  });

  return _client;
};

get_client().then(client => {
  client.subscribe({query: onCreateNote}).subscribe({
    next: (data) => console.log('next data', {data}),
    error: (err) => console.warn('err', err),
    complete: () => console.warn('done')
  });
});

function App() {

  const [notes, setNotes] = useState([]);
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteDetails, setNewNoteDetails] = useState('');

  // const { loading, error, notes } = useQuery(listNotes);

  useEffect(() => {
    // this is called after the component renders in the DOM.
    // so ... anything we want to run after we're sure the thing
    // is in the DOM goes here.
    get_client().then(client => {
      client.query({query: listNotes}).then(result => setNotes(result.data.listNotes.items));
    });
  });

  // if (loading) return <p>Loading ...</p>;
  // if (error) return <p>Error!</p>;

  function handleSubmit(e) {
    e.preventDefault();
    get_client().then(client => {
      client.mutate({
        mutation: createNote,
        variables: {
          input: {
            name: newNoteName,
            details: newNoteDetails
          }
        }
      }); // .then(() => document.location.reload());
      setNewNoteName('');
      setNewNoteDetails('');
    }); // better to have a subscription
  };

  function handleDelete(note) {
    get_client().then(client => {
      client.mutate({
        mutation: deleteNote,
        variables: {
          input: {
            id: note.id
          }
        }
      }).then(document.location.reload()); // better to have a subscription?
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h3>My Notes</h3>
      </header>
      <div>
        <div>
          {notes.map((note) => (
            <div className='App-note' key={note.id}>
              <div className='delete' onClick={e => handleDelete(note)}>X</div>
              <h4 className='name'>{note.name}</h4>
              <div className='details'>{note.details}</div>
            </div>
          ))}
        </div>
        <h4>Add a Note:</h4>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Name:</label>
            <input
              type='text'
              value={newNoteName}
              onChange={e => setNewNoteName(e.target.value)}
            />
          </div>
          <div>
            <label>Details:</label>
            <textarea
              value={newNoteDetails}
              onChange={e => setNewNoteDetails(e.target.value)}
            ></textarea>
          </div>
          <div>
            <input type='submit' value='Add' />
          </div>
        </form>
      </div>
    </div>
  );
};

export default withAuthenticator(App, true);
