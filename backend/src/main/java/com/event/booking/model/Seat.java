package com.event.booking.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "seats")
public class Seat {
    @Id
    private String id;
    private String eventId;
    private String seatNumber; // E.g., "A12"
    private String status; // AVAILABLE, BOOKED
}
