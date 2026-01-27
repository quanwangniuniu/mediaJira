clamd
=====

.. image:: https://travis-ci.org/graingert/python-clamd.png?branch=master
   :alt: travis build status
   :target: https://travis-ci.org/graingert/python-clamd

About
-----
`clamd` is a portable Python module to use the ClamAV anti-virus engine on 
Windows, Linux, MacOSX and other platforms. It requires a running instance of 
the `clamd` daemon.

This is a fork of pyClamd v0.2.0 created by Philippe Lagadec and published on his website: http://www.decalage.info/en/python/pyclamd which in turn is a slightly improved version of pyClamd v0.1.1 created by Alexandre Norman and published on his website: http://xael.org/norman/python/pyclamd/

Usage
-----

To use with a unix socket::

    >>> import clamd
    >>> cd = clamd.ClamdUnixSocket()
    >>> cd.ping()
    'PONG'
    >>> cd.version()                             # doctest: +ELLIPSIS
    'ClamAV ...
    >>> cd.reload()
    'RELOADING'

To scan a file::

    >>> open('/tmp/EICAR','wb').write(clamd.EICAR)
    >>> cd.scan('/tmp/EICAR')
    {'/tmp/EICAR': ('FOUND', 'Eicar-Test-Signature')}

To scan a stream::

    >>> from six import BytesIO
    >>> cd.instream(BytesIO(clamd.EICAR))
    {'stream': ('FOUND', 'Eicar-Test-Signature')}


License
-------
`clamd` is released as open-source software under the LGPL license.

clamd Install
-------------
How to install the ClamAV daemon `clamd` under Ubuntu::

    sudo apt-get install clamav-daemon clamav-freshclam clamav-unofficial-sigs
    sudo freshclam
    sudo service clamav-daemon start


Changes
=========

1.0.2 (2014-08-21)
------------------

- Remove all dependencies. clamd is now standalone!
- Use plain setuptools no d2to1.
- Create universal wheel.


1.0.1 (2013-03-06)
------------------

- Updated d2to1 dependency


1.0.0 (2013-02-08)
------------------

- Change public interface, including exceptions
- Support Python 3.3, withdraw 2.5 support


0.3.4 (2013-02-01)
------------------

- Use regex to parse file status reponse instead of complicated string split/join


0.3.3 (2013-01-28)
------------------

- First version of clamd that can be installed from PyPI


