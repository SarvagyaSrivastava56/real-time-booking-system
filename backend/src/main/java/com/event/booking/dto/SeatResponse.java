package com.event.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatResponse {
    private String id;
    private String eventId;
    private String seatNumber;
    private String status; // AVAILABLE, HELD, BOOKED
    private String heldBy; // userId
    private Long holdTimeRemaining; // TTL in seconds
}
