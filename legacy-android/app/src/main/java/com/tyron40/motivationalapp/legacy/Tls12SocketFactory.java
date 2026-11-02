package com.tyron40.motivationalapp.legacy;

import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

final class Tls12SocketFactory extends SSLSocketFactory {
    private final SSLSocketFactory delegate;

    Tls12SocketFactory(SSLSocketFactory delegate) {
        this.delegate = delegate;
    }

    private Socket patch(Socket socket) {
        if (socket instanceof SSLSocket) {
            SSLSocket ssl = (SSLSocket) socket;
            List<String> supported = Arrays.asList(ssl.getSupportedProtocols());
            List<String> enabled = new ArrayList<String>();
            for (String protocol : new String[] { "TLSv1.2", "TLSv1.1", "TLSv1" }) {
                if (supported.contains(protocol)) enabled.add(protocol);
            }
            if (!enabled.isEmpty()) {
                ssl.setEnabledProtocols(enabled.toArray(new String[enabled.size()]));
            }
        }
        return socket;
    }

    @Override public String[] getDefaultCipherSuites() { return delegate.getDefaultCipherSuites(); }
    @Override public String[] getSupportedCipherSuites() { return delegate.getSupportedCipherSuites(); }
    @Override public Socket createSocket(Socket s, String h, int p, boolean a) throws IOException { return patch(delegate.createSocket(s, h, p, a)); }
    @Override public Socket createSocket(String h, int p) throws IOException, UnknownHostException { return patch(delegate.createSocket(h, p)); }
    @Override public Socket createSocket(String h, int p, InetAddress l, int lp) throws IOException, UnknownHostException { return patch(delegate.createSocket(h, p, l, lp)); }
    @Override public Socket createSocket(InetAddress h, int p) throws IOException { return patch(delegate.createSocket(h, p)); }
    @Override public Socket createSocket(InetAddress h, int p, InetAddress l, int lp) throws IOException { return patch(delegate.createSocket(h, p, l, lp)); }
}
