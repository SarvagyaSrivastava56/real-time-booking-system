package com.event.booking.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "bookings")
public class Booking {
    @Id
    private String id;
    private String userId;
    private String eventId;
    private List<String> seatIds;
    private List<String> seatNumbers; // E.g., ["A12", "A13"]
    private LocalDateTime bookingTime;
    private double totalPrice;
}
