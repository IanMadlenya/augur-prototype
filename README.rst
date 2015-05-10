Augur: decentralized prediction markets
---------------------------------------

.. image:: https://badges.gitter.im/Join%20Chat.svg
   :alt: Join the chat at https://gitter.im/AugurProject/augur
   :target: https://gitter.im/AugurProject/augur?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge

.. image:: https://travis-ci.org/AugurProject/augur.svg
    :target: https://travis-ci.org/AugurProject/augur

.. image:: https://coveralls.io/repos/AugurProject/augur/badge.png
  :target: https://coveralls.io/r/AugurProject/augur

This is the Augur prototype.  It is currently in alpha testing.  Our installation procedures and other documentation will get better/easier as time goes on and we smooth out the rough edges!  In the meantime, please `email <mailto:team@augur.net>`__ us or join us in `#augur <irc://irc.freenode.net/augur>`__ on FreeNode IRC if you have trouble installing or running the prototype.

Requirements
~~~~~~~~~~~~

-  Python 2.7
-  git
-  pip

Installation
~~~~~~~~~~~~

MacOS X
^^^^^^^

First, install `Xcode command line tools <https://developer.apple.com/downloads/>`__. Then enter the
following commands in the terminal:

::

    $ git clone https://github.com/AugurProject/augur.git
    $ cd augur
    $ sudo pip install -r requirements.txt

Start the Augur client using ``augur_ctl``:

::

    $ ./augur_ctl start


Linux
^^^^^

Try easy (but alpha) install with Docker

* build: ``sudo docker build -t augur .``
* run: ``sudo docker run -p 9000:9000 augur``

or...

So far, we have only tested augur on Ubuntu 12.04/14.04.  If you've tested it on another Linux distro, `let us know <mailto:team@augur.net>`__!

First, you will need to install a few background packages using ``apt-get``:

::

    $ apt-get install git libpython-dev python-numpy python-leveldb
    $ pip2 install m3-cdecimal

    $ git clone https://github.com/AugurProject/augur.git
    $ cd augur
    $ pip install -r requirements.txt

Start the Augur client using ``augur_ctl``:

::

    $ ./augur_ctl start


Windows
^^^^^^^

Windows installer: `Augur_0.3.2.exe <http://augur.link/Augur_0.3.2.exe>`__

After running the installer, click on your Start Menu, navigate to the Augur application folder, then click on Augur.  A command window should appear, containing some debugging information, and saying that Augur is running on ``http://localhost:9000``.  Open your web browser and enter ``http://localhost:9000`` in the address bar, and you should be up and running.

Note: this installer has only been tested so far on Windows 7 (64-bit).

If you want to run the Augur source code on Windows, a few extra steps are required:

1. First, make sure you have `Python installed <https://www.python.org/downloads/release/python-278/>`__.

2. You need to install a few dependencies: numpy, six, cdecimal and pip, which can all be found `here <http://www.lfd.uci.edu/~gohlke/pythonlibs/>`__.  I recommend using Ctrl+F to find them.  Make sure you get the newest one that matches your Python installation's architecture!

3. Once those are installed, you need to download `ez\_setup.py <https://bitbucket.org/pypa/setuptools/raw/bootstrap/ez_setup.py>`__ (right click on the link and click "Save Target As" and save with the name ez\_setup.py.) You should be able to double click this file if you have installed Python, and it will run and close on its own.

4. Now you need to edit the ``Path`` environment variable. To do this, go to the ``Start menu``, right click on ``Computer``, click on ``Advanced System Settings`` in the upper left, click ``Environment Variables`` in the bottom right, then in the ``System Variables`` section, scroll down till you see ``Path``. Click on ``Path``, and click ``Edit...``. Press the ``Home`` key to get to the start of the line, then add ``C:\Python27\Scripts;C:\Python27\;`` to the start of the line and click ``OK``.

5. Now go to http://aka.ms/vcpython27 to download and install the windows C compiler for use with pip.

6. Finally, go back to the ``Start Menu`` type ``cmd`` and press ``Enter``, then type ``pip install flask flask-socketio``.

Run augur by going into the ``augur`` directory and double-clicking on ``augur.py``.

Usage
~~~~~

Once augur is installed, navigate to ``http://localhost:9000`` in your web browser, and you should see the augur interface.  To fire up your local node, click the red "Node stopped" button, then "Start node".  After your node starts, you will see the main interface.
