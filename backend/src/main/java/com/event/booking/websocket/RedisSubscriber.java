package com.event.booking.websocket;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

@Component
public class RedisSubscriber implements MessageListener {

    private final EventWebSocketHandler webSocketHandler;

    public RedisSubscriber(EventWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String eventId = new String(message.getBody());
        webSocketHandler.broadcastSeatUpdateLocally(eventId);
    }
}
