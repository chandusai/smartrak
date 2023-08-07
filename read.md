Availability of a pool vehicle for use by company staff is determined if it is inside one of a the geofences in the specified set of geofences. The pool availability is calculated as the number of vehicles inside a geofence at each 15 minute period during business hours where business hours are 8:30 am to 5:00 pm

Attahced is a csv file containing time periods  in local time but formatted in universal time that each vehicle was inside one of the specified geofences.

Given that a geofence period is defined as:

public class GeofencePeriod
{
	public int VehicleId { get; set;}
	public DateTime EnterTime { get; set;}
	public DateTime ExitTime { get; set; }
}

Write an application in the language of your choice that populates the collection from the CSV file and transforms the geofence period data into a table containing two columns, the first column is a number of vehicles and the second column is the number of hours per week to a resolution of 15 minutes where no vehicles are available if the number of vehicles in the first column were sold. 



