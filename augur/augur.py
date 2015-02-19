#!/usr/bin/env python
"""
augur: decentralized prediction markets

"""
from __future__ import division
import sys
try:
    import cdecimal
    sys.modules["decimal"] = cdecimal
except:
    pass
from gevent import monkey
monkey.patch_all()
import os
import sys
import json
import datetime
import socket
import time
import re
import ast
import random
from decimal import Decimal
from subprocess import call, Popen
from string import ascii_uppercase, ascii_lowercase, digits
from flask import Flask, session, request, escape, url_for, redirect, render_template, g, abort, send_from_directory
from flask_socketio import SocketIO, emit, send
from werkzeug import secure_filename
import hashlib
import base64
from six.moves import xrange as range

__title__      = "augur"
__version__    = "0.3"
__author__     = "Scott Leonard, Jack Peterson, Chris Calderon"
__license__    = "MIT"
__maintainer__ = "Scott Leonard"
__email__      = "scott@augur.net"

_IS_PYTHON_3 = sys.version_info[0] == 3
identity = lambda x : x
if _IS_PYTHON_3:
    u = identity
else:
    import codecs
    def u(string):
        return codecs.unicode_escape_decode(string)[0]

HERE = os.path.dirname(os.path.realpath(__file__))
EXE_PATH = os.path.dirname(sys.executable)
FROZEN = getattr(sys, 'frozen', False)
if FROZEN:
    app = Flask(__name__, template_folder=EXE_PATH,
                          static_folder=os.path.join(EXE_PATH, "static"))
else:
    app = Flask(__name__, template_folder='.')
socketio = SocketIO(app)
app.config['DEBUG'] = True

# node API communication
class Api(object):

    MAX_MESSAGE_SIZE = 60000
    BUY_SHARES_TARGET = '0' * 3 + '1' + '9' * 60

    def __init__(self):
        self.core = None
        self.tx_count = 0
        self.host = 'localhost'
        self.port = 8899
        self.pubkey = None

        # look for augur core; if not found, download and install one
        if FROZEN:
            self.core_path = os.path.join(EXE_PATH, "core")
        else:
            self.core_path = os.path.join(HERE, "core")
            if not os.path.isdir(self.core_path):
                self.core_path = os.path.join(HERE, os.pardir, "core")
                if not os.path.isdir(self.core_path):
                    self.core_path = os.path.join(HERE, "core")
                    import git
                    core_repository = "https://github.com/AugurProject/augur-python.git"
                    app.logger.info("Core not found.\nCloning " +\
                                     core_repository + " to:\n" + self.core_path)
                    os.mkdir(self.core_path)
                    repo = git.Repo.init(self.core_path)
                    origin = repo.create_remote("origin", core_repository)
                    origin.fetch()
                    origin.pull(origin.refs[0].remote_head)

        if os.path.isdir(self.core_path):
            sys.path.insert(0, self.core_path)
            app.logger.info("Found augur core at " + self.core_path)
        else:
            app.logger.error("Failed to install or find augur-core.\n"+\
                             "You can manually set the path in node options.")

    @property
    def python_cmd(self):
        if sys.platform == 'win32':
            result = os.path.split(sys.executable)[:-1] + ('pythonw.exe',)
        else:
            result = ('python',)
        return os.path.join(*result)

    def start_node(self, password):
        if FROZEN:
            if sys.platform == "win32":
                Popen([os.path.join(self.core_path, "core.exe"), password])
            else:
                from core import threads
                if os.fork() == 0:
                    threads.main(password)
        else:
            cmd = os.path.join(self.core_path, 'threads.py')
            Popen([self.python_cmd, cmd, password])
            #from core import threads
            #if os.fork() == 0:
            #    threads.main(password)

    def stop_node(self):
        self.send({'command': ['stop']})

    def connect(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setblocking(5)
        try:
            s.connect((self.host, self.port))
        except:
            return {
                'error': 'cannot connect host:' + str(self.host)+\
                         ' port:' + str(self.port)
            }
        return s

    def send(self, msg, retry=0):
        if retry > 3:
            return {'error': 'could not get a response'}
        s = self.connect()
        if retry == 0:
            # add version
            msg['version'] = '0.0009'

        json_msg = json.dumps(msg)
        padded_json = str(len(json_msg)).rjust(5, '0') + json_msg
        while padded_json:
            time.sleep(0.0001)
            try:
                sent = s.send(padded_json)
            except:
                return None 
            padded_json = padded_json[sent:]
        response = self.receive(s)
        if response == 'broken connection':
            app.logger.error('broken connection: ' + str(msg))
            return self.send(msg, retry=retry+1)
        elif response == 'no length':
            app.logger.error('no length: ' + str(msg))
            return self.send(msg, retry=retry+1)
        return response

    def receive(self, s, data=''):
        try:
            data += s.recv(self.MAX_MESSAGE_SIZE)
        except:
            time.sleep(0.0001)
            app.logger.info('data not ready')
            self.receive(s, data)   
        if not data:
            return 'broken connection'
        if len(data) < 5: 
            return self.receive(s, data)
        try:
            length = int(data[0:5])
        except:
            return 'no length'
        data = data[5:]
        while len(data) < length:
            d = s.recv(self.MAX_MESSAGE_SIZE - len(data))
            if not d:
                return 'broken connection'
            data += d

        # do anything and everything here to detect the different 
        # malformed response data and massage it back into python
        try:
            data = ast.literal_eval(data)
        except Exception as e:
            app.logger.error(e)
        if type(data) == str and re.match(r'[\{\[]', data):
            try:
                data = ast.literal_eval(data)
            except Exception as e:
                app.logger.error(e)
        return data

    def det_hash(self, tx):
        return hashlib.sha384(json.dumps(tx, sort_keys=True)).hexdigest()[0:64]

    def get_market(self, id=None):
        if id:
            return self.send({'command':['info', id]})

api = Api()

###
# routes and websocket handlers

@app.route('/', methods=['GET', 'POST'])
def dash():
    return render_template('augur.html')

@app.route('/static/<path:filename>')
@app.route('/fonts/<path:filename>')
def fonts(filename):
    return send_from_directory('static', filename)

@socketio.on('settings', namespace='/socket.io/')
def settings(settings):
    if settings:
        api.host = settings['host']
        api.port = int(settings['port'])
        api.core_path = settings['core_path']
    else:
        settings = {
            'host': api.host,
            'port': int(api.port),
            'core_path': api.core_path
        }
    emit('settings', settings)

@socketio.on('ping', namespace='/socket.io/')
def ping():

    data = api.send({ 'command': ['peers'] })

    if data:
        if type(data) == dict:
            peers = data
        else:
            peers = {}
            for peer in data:
                address = peer[0][0]
                peers[address] = {'length': int(peer[3]), 'port': peer[0][1], 'id': peer[2]}

        emit('peers', peers)

    data = api.send({ 'command': ['blockcount'] })
    if data:
        emit('blockcount', int(data))
    else:
        emit('node-down')
    data = api.send({ 'command': ['mine'] })
    if data:
        if re.match('miner on', data) or re.match('miner is currently: on', data):
            emit('miner', 'on')
        elif re.match('miner is now turned off', data) or re.match('miner is currently: off', data):
            emit('miner', 'off')
        else:
            emit('miner', 'error')

@socketio.on('get-account', namespace='/socket.io/')
def get_account():
    data = api.send({ 'command': ['info', 'my_address'] })
    if data:
        api.address = api.send({ 'command': ['my_address'] })
        api.privkey = str(api.send({ 'command': ['info', 'privkey'] }))

        # update tx count for push_tx commands (%$^#%$^)
        api.tx_count = data['count']
        account = {
            'address': api.address,
            'privkey': api.privkey,
            'pubkey': api.pubkey,
            'cash': data['amount'],
            'shares': data['shares'],
            'branches': data['votecoin'],
            'decisions': data.get('votes', {})
        }

        # update votes if there are any
        data = api.send({ 'command': ['info', 'memoized_votes'] })
        if data:
            for d, v in account['decisions'].items():
                if data.get(v):
                    account['decisions'][d] = data[v][0]

        emit('account', account)

@socketio.on('update-account', namespace='/socket.io/')
def update_account():
    data = api.send({ 'command': ['info', 'my_address'] })
    account = {
        'cash': data['amount'],
        'shares': data['shares'],
        'branches': data['votecoin']
    }
    emit('account', account)

@socketio.on('get-blocks', namespace='/socket.io/')
def get_blocks(start, end):
    blocks = api.send({ 'command': ['blocks', start, end] })
    if blocks:
        emit('blocks', blocks)

@socketio.on('peers', namespace='/socket.io/')
def peers():
    data = api.send({ 'command': ['peers'] })
    if data:
        emit('peers', data)

@socketio.on('blockcount', namespace='/socket.io/')
def blockcount():
    data = api.send({ 'command': ['blockcount'] })
    if data:
        emit('blockcount', data)

@socketio.on('report', namespace='/socket.io/')
def report(report):
    data = api.send({
        'command': [
            'vote_on_decision',
            report['vote_id'],
            report['decision_id'],
            report['state']
        ]
    })
    app.logger.debug(data)

@socketio.on('explore-block', namespace='/socket.io/')
def explore_block(block_number):
    data = api.send({ 'command': ['info', block_number] })
    if data:
        block = json.dumps(data, indent=3, sort_keys=True)
        emit('show-block', block)

@socketio.on('start', namespace='/socket.io/')
def start(password):
    api.start_node(password)

@socketio.on('stop', namespace='/socket.io/')
def stop():
    api.stop_node()

@socketio.on('miner', namespace='/socket.io/')
def miner(arg):
    if arg == 'start':
        data = api.send({ 'command': ['mine', 'on'] })
    elif arg == 'stop':
        data = api.send({ 'command': ['mine', 'off'] })
    if data:
        if re.match('miner on', data) or re.match('miner is currently: on', data):
            emit('miner', 'on')
        elif re.match('miner is now turned off', data) or re.match('miner is currently: off', data):
            emit('miner', 'off')
        else:
            emit('miner', 'error')
        app.logger.debug(data)

@socketio.on('send-cash', namespace='/socket.io/')
def send_cash(address, amount):
    data = api.send({ 'command':['spend', amount, address] })
    app.logger.debug(data)

@socketio.on('send-reps', namespace='/socket.io/')
def send_reps(address, amount, branch):
    data = api.send({ 'command':['votecoin_spend', amount, branch, address] })
    app.logger.debug(data)

@socketio.on('create-branch', namespace='/socket.io/')
def create_branch(name):
    data = api.send({ 'command':['create_jury', name] })
    app.logger.debug(data)

@socketio.on('add-decision', namespace='/socket.io/')
def add_decision(args):
    block = args['decisionMaturation']
    randstring = ''.join(
        random.choice(ascii_uppercase+ascii_lowercase+digits) for _ in range(8)
    )
    args['decisionId'] = hashlib.sha1(args['decisionText'] + randstring).hexdigest()[:16]
    data = api.send({
        'command': [
            'ask_decision',
            args['branchId'],
            block,
            args['decisionId'],
            args['decisionText']
        ]
    })
    app.logger.debug(data)
    add_market(args)

@socketio.on('add-market', namespace='/socket.io/')
def add_market(args):
    """Simplified market creation for single-decision binary markets.
    
    Examples:
      ./truth_cli.py create_pm PM_id B decisions states states_combinatory
      ./truth_cli.py create_pm pm_id_0 1000 decision_0,decision_1 case_1,case_2,case_3,case_4 0,0.1,0.0,1]

    """
    app.logger.debug(args)
    data = api.send({
        "command": [
            "create_pm", 
            args['decisionId'] + '.market', # PM_id
            int(filter(lambda x: x not in [',','.'], args["marketInv"])), # B
            str(args["decisionId"]), # decision list
            "0,1", # states
            "0", # states_combinatory
        ]
    })
    app.logger.debug(data)

@socketio.on('update-market', namespace='/socket.io/')
def update_market(id):
    data = api.get_market(id)
    if data:
        emit('market', data)

@socketio.on('trade', namespace='/socket.io/')
def trade(args):
    """Buy or Sell shares of a prediction.

    For example, this would sell 200 of the first
    state in PM_id, and buy 1000 of the second:
    
      ./truth_cli.py trade_shares PM_id -200,1000

    Args:
      {
        "marketId": "1f56c5596200f0f9.market", 
        "marketState": "0", 
        "tradeAmount": "100", 
        "tradeType": "buy"
      }

    """
    trade = None
    app.logger.debug(args)
    market_info = api.get_market(args["marketId"])
    trade = []
    for i, state in enumerate(market_info["states"]):
        if args["marketState"] == state:
            trade.append(("" if args["tradeType"] == "buy" else "-") + args["tradeAmount"])
        else:
            trade.append("0")
    if trade:
        data = api.send({
            "command": [
                "trade_shares",
                args["marketId"],
                ",".join(trade),
            ]
        })
        app.logger.debug(data)
    else:
        app.logger.error("Unknown market state: " + args["marketState"])

###
# main
if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=9000)
    print("Stopping...")
